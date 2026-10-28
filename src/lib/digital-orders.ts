import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { digitalCategories, digitalOrderItems, digitalOrders, digitalProductFiles, digitalProducts } from "@/db/schema";
import type { DigitalPaymentMethod, DigitalOrderStatus } from "@/lib/downloads-types";

export class DigitalOrderValidationError extends Error {}
export class DigitalOrderNotFoundError extends Error {}
export class DigitalOrderAuthorizationError extends Error {}

type AccessOrder = typeof digitalOrders.$inferSelect;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function email(value: unknown) { if (typeof value !== "string") return null; const normalized = value.trim().toLowerCase(); return normalized.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null; }
function optionalName(value: unknown) { if (value === null || value === undefined || value === "") return null; return typeof value === "string" && value.trim().length <= 200 ? value.trim() : undefined; }
function paymentMethod(value: unknown): DigitalPaymentMethod | null { return value === "bank_transfer" || value === "paypal" ? value : null; }
function orderToken() { return randomBytes(32).toString("base64url"); }
export function hashOrderToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function verifiesToken(order: AccessOrder, token: string) { const received = Buffer.from(hashOrderToken(token), "hex"); const expected = Buffer.from(order.accessTokenHash, "hex"); return received.length === expected.length && timingSafeEqual(received, expected); }

export function parseCreateDigitalOrder(input: unknown) { if (!isRecord(input) || typeof input.productSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.productSlug)) throw new DigitalOrderValidationError("Producto inválido"); const customerEmail = email(input.customerEmail); const customerName = optionalName(input.customerName); const method = paymentMethod(input.paymentMethod); if (!customerEmail || customerName === undefined || !method) throw new DigitalOrderValidationError("Revisa los datos del pedido"); return { productSlug: input.productSlug, customerEmail, customerName, paymentMethod: method }; }
export function parseOrderAccess(input: unknown) { if (!isRecord(input) || typeof input.accessToken !== "string" || input.accessToken.length < 32 || input.accessToken.length > 200) throw new DigitalOrderAuthorizationError("Acceso de pedido inválido"); return input.accessToken; }

export async function createDigitalOrder(input: unknown) {
  const values = parseCreateDigitalOrder(input);
  const [productRecord] = await db.select({ product: digitalProducts, category: digitalCategories }).from(digitalProducts).innerJoin(digitalCategories, eq(digitalProducts.categoryId, digitalCategories.id)).where(and(eq(digitalProducts.slug, values.productSlug), eq(digitalProducts.isPublished, true), eq(digitalCategories.isPublished, true))).limit(1);
  if (!productRecord) throw new DigitalOrderNotFoundError("Producto no disponible");
  const token = orderToken();
  const order = await db.transaction(async (tx) => {
    const [created] = await tx.insert(digitalOrders).values({ accessTokenHash: hashOrderToken(token), customerEmail: values.customerEmail, customerName: values.customerName, paymentMethod: values.paymentMethod, status: "pending_payment", currency: "USD", subtotalCents: productRecord.product.priceCents, totalCents: productRecord.product.priceCents }).returning();
    if (!created) throw new Error("Order creation failed");
    await tx.insert(digitalOrderItems).values({ orderId: created.id, productId: productRecord.product.id, productNameSnapshot: productRecord.product.name, productSlugSnapshot: productRecord.product.slug, unitPriceCents: productRecord.product.priceCents });
    return created;
  });
  return { publicId: order.publicId, accessToken: token, status: "pending_payment" as const, paymentMethod: values.paymentMethod };
}

export async function getAuthorizedDigitalOrder(publicId: string, token: string) {
  const [record] = await db.select({ order: digitalOrders, item: digitalOrderItems }).from(digitalOrders).innerJoin(digitalOrderItems, eq(digitalOrderItems.orderId, digitalOrders.id)).where(eq(digitalOrders.publicId, publicId)).limit(1);
  if (!record) throw new DigitalOrderNotFoundError("Pedido no encontrado");
  if (!verifiesToken(record.order, token)) throw new DigitalOrderAuthorizationError("No tienes acceso a este pedido");
  return { order: record.order, item: record.item };
}

/** Safe order view never returns access_token_hash or private Storage paths. */
export async function getDigitalOrderView(publicId: string, token: string) { const { order, item } = await getAuthorizedDigitalOrder(publicId, token); const files = order.status === "paid" && item.productId ? await db.select({ id: digitalProductFiles.id, originalName: digitalProductFiles.originalName, mimeType: digitalProductFiles.mimeType, sizeBytes: digitalProductFiles.sizeBytes }).from(digitalProductFiles).where(eq(digitalProductFiles.productId, item.productId)) : []; return { publicId: order.publicId, status: order.status as DigitalOrderStatus, paymentMethod: order.paymentMethod as DigitalPaymentMethod, customerEmail: order.customerEmail, customerName: order.customerName, currency: "USD" as const, totalCents: order.totalCents, productName: item.productNameSnapshot, productSlug: item.productSlugSnapshot, createdAt: order.createdAt.toISOString(), paidAt: order.paidAt?.toISOString() ?? null, files }; }

export async function authorizeDigitalDownload(publicId: string, token: string, fileId: unknown) {
  if (typeof fileId !== "number" || !Number.isInteger(fileId) || fileId <= 0) throw new DigitalOrderValidationError("Archivo inválido");
  const { order, item } = await getAuthorizedDigitalOrder(publicId, token);
  if (order.status !== "paid") throw new DigitalOrderAuthorizationError("La descarga estará disponible cuando el pago sea confirmado");
  const [file] = await db.select().from(digitalProductFiles).where(and(eq(digitalProductFiles.id, fileId), eq(digitalProductFiles.productId, item.productId ?? -1))).limit(1);
  if (!file) throw new DigitalOrderAuthorizationError("El archivo no pertenece a este pedido");
  return file;
}
