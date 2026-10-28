import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  digitalCategories,
  digitalOrderItems,
  digitalOrders,
  digitalProductFiles,
  digitalProductImages,
  digitalProducts,
} from "@/db/schema";
import type {
  DigitalCategory,
  DigitalCategoryPayload,
  DigitalFile,
  DigitalFilePayload,
  DigitalOrderStatus,
  DigitalOrderSummary,
  DigitalPreview,
  DigitalPreviewPayload,
  DigitalProduct,
  DigitalProductPayload,
  DigitalSpecification,
} from "@/lib/downloads-types";

export class DownloadsValidationError extends Error {}
export class DownloadsNotFoundError extends Error {}
export class DownloadsCategoryInUseError extends Error {}
export class DownloadsProductHistoryError extends Error {}
export class DownloadsSlugConflictError extends Error {}

type StoredPreview = typeof digitalProductImages.$inferSelect;
type StoredFile = typeof digitalProductFiles.$inferSelect;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function positiveId(value: unknown): number | null { return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null; }
function nonNegativeInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value) && value >= 0; }
function requiredText(value: unknown, maxLength: number): string | null { if (typeof value !== "string") return null; const text = value.trim(); return text.length > 0 && text.length <= maxLength ? text : null; }
function nullableText(value: unknown, maxLength: number): string | null | undefined { if (value === null || value === undefined) return null; if (typeof value !== "string") return undefined; const text = value.trim(); return text.length <= maxLength ? text || null : undefined; }
function validSlug(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 160; }
function isPreviewPath(value: unknown): value is string { return typeof value === "string" && value.startsWith("downloads/") && value.length > 10 && value.length <= 500 && !value.includes("..") && !value.includes("\\"); }
function isPrivatePath(value: unknown): value is string { return typeof value === "string" && value.startsWith("downloads/") && value.length > 10 && value.length <= 500 && !value.includes("..") && !value.includes("\\"); }
function isUniqueViolation(error: unknown): boolean { return isRecord(error) && error.code === "23505"; }

function specifications(value: unknown): DigitalSpecification[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DigitalSpecification => isRecord(item) && typeof item.label === "string" && typeof item.value === "string");
}

function mapPreview(image: StoredPreview): DigitalPreview { return { id: image.id, productId: image.productId, storagePath: image.storagePath, altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary, createdAt: image.createdAt.toISOString() }; }
function mapFile(file: StoredFile): DigitalFile { return { id: file.id, productId: file.productId, storagePath: file.storagePath, originalName: file.originalName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, sortOrder: file.sortOrder, createdAt: file.createdAt.toISOString() }; }
function mapCategory(category: typeof digitalCategories.$inferSelect, productCount: number): DigitalCategory { return { id: category.id, name: category.name, slug: category.slug, description: category.description, sortOrder: category.sortOrder, isPublished: category.isPublished, productCount, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() }; }
function mapProduct(product: typeof digitalProducts.$inferSelect, category: Pick<typeof digitalCategories.$inferSelect, "name" | "slug">, previews: StoredPreview[], files: StoredFile[]): DigitalProduct { return { id: product.id, categoryId: product.categoryId, categoryName: category.name, categorySlug: category.slug, name: product.name, slug: product.slug, shortDescription: product.shortDescription, description: product.description, specifications: specifications(product.specifications), priceCents: product.priceCents, currency: "USD", sortOrder: product.sortOrder, isPublished: product.isPublished, createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString(), previews: previews.sort((a, b) => a.sortOrder - b.sortOrder).map(mapPreview), files: files.sort((a, b) => a.sortOrder - b.sortOrder).map(mapFile) }; }

export function parseDigitalCategoryPayload(input: unknown): DigitalCategoryPayload {
  if (!isRecord(input)) throw new DownloadsValidationError("Datos de categoría inválidos");
  const name = requiredText(input.name, 160); const description = nullableText(input.description, 2000);
  if (!name || !validSlug(input.slug) || description === undefined || !nonNegativeInteger(input.sortOrder) || typeof input.isPublished !== "boolean") throw new DownloadsValidationError("Revisa los campos de la categoría");
  return { name, slug: input.slug, description, sortOrder: input.sortOrder, isPublished: input.isPublished };
}

function parseSpecifications(value: unknown): DigitalSpecification[] {
  if (!Array.isArray(value) || value.length > 30) throw new DownloadsValidationError("Las especificaciones no son válidas");
  return value.map((item) => { if (!isRecord(item)) throw new DownloadsValidationError("Las especificaciones no son válidas"); const label = requiredText(item.label, 120); const specificationValue = requiredText(item.value, 300); if (!label || !specificationValue) throw new DownloadsValidationError("Las especificaciones no son válidas"); return { label, value: specificationValue }; });
}

export function parseDigitalProductPayload(input: unknown): DigitalProductPayload {
  if (!isRecord(input)) throw new DownloadsValidationError("Datos de producto inválidos");
  const categoryId = positiveId(input.categoryId); const name = requiredText(input.name, 200); const shortDescription = requiredText(input.shortDescription, 500); const description = nullableText(input.description, 8000);
  if (categoryId === null || !name || !shortDescription || !validSlug(input.slug) || description === undefined || !nonNegativeInteger(input.priceCents) || !nonNegativeInteger(input.sortOrder) || typeof input.isPublished !== "boolean") throw new DownloadsValidationError("Revisa los campos del producto");
  return { categoryId, name, slug: input.slug, shortDescription, description, specifications: parseSpecifications(input.specifications), priceCents: input.priceCents, sortOrder: input.sortOrder, isPublished: input.isPublished };
}

export function parseDigitalPreviewPayloads(input: unknown): DigitalPreviewPayload[] {
  if (!isRecord(input) || !Array.isArray(input.images) || input.images.length > 12) throw new DownloadsValidationError("Los previews no son válidos");
  const images = input.images.map((item): DigitalPreviewPayload => { if (!isRecord(item)) throw new DownloadsValidationError("Los previews no son válidos"); const id = item.id === undefined ? undefined : positiveId(item.id); const altText = nullableText(item.altText, 300); if (id === null || !isPreviewPath(item.storagePath) || altText === undefined || !nonNegativeInteger(item.sortOrder) || typeof item.isPrimary !== "boolean") throw new DownloadsValidationError("Los previews no son válidos"); return { ...(id === undefined ? {} : { id }), storagePath: item.storagePath, altText, sortOrder: item.sortOrder, isPrimary: item.isPrimary }; });
  if (new Set(images.map((image) => image.storagePath)).size !== images.length || new Set(images.map((image) => image.sortOrder)).size !== images.length || images.filter((image) => image.isPrimary).length > 1) throw new DownloadsValidationError("Los previews no son válidos");
  return images;
}

export function parseDigitalFilePayloads(input: unknown): DigitalFilePayload[] {
  if (!isRecord(input) || !Array.isArray(input.files) || input.files.length > 30) throw new DownloadsValidationError("Los archivos no son válidos");
  const files = input.files.map((item): DigitalFilePayload => { if (!isRecord(item)) throw new DownloadsValidationError("Los archivos no son válidos"); const id = item.id === undefined ? undefined : positiveId(item.id); const originalName = requiredText(item.originalName, 300); const mimeType = nullableText(item.mimeType, 160); const sizeBytes = item.sizeBytes === null || item.sizeBytes === undefined ? null : nonNegativeInteger(item.sizeBytes) ? item.sizeBytes : undefined; if (id === null || !isPrivatePath(item.storagePath) || !originalName || mimeType === undefined || sizeBytes === undefined || !nonNegativeInteger(item.sortOrder)) throw new DownloadsValidationError("Los archivos no son válidos"); return { ...(id === undefined ? {} : { id }), storagePath: item.storagePath, originalName, mimeType, sizeBytes, sortOrder: item.sortOrder }; });
  if (new Set(files.map((file) => file.storagePath)).size !== files.length || new Set(files.map((file) => file.sortOrder)).size !== files.length) throw new DownloadsValidationError("Los archivos no son válidos");
  return files;
}

export async function listDigitalCategories(): Promise<DigitalCategory[]> { const [categories, counts] = await Promise.all([db.select().from(digitalCategories).orderBy(asc(digitalCategories.sortOrder), asc(digitalCategories.name)), db.select({ categoryId: digitalProducts.categoryId, productCount: sql<number>`count(*)::int` }).from(digitalProducts).groupBy(digitalProducts.categoryId)]); const countByCategory = new Map(counts.map((entry) => [entry.categoryId, entry.productCount])); return categories.map((category) => mapCategory(category, countByCategory.get(category.id) ?? 0)); }

export async function listDigitalProducts(): Promise<DigitalProduct[]> {
  const records = await db.select({ product: digitalProducts, category: digitalCategories }).from(digitalProducts).innerJoin(digitalCategories, eq(digitalProducts.categoryId, digitalCategories.id)).orderBy(asc(digitalProducts.sortOrder), asc(digitalProducts.name));
  const ids = records.map((record) => record.product.id); const [previews, files] = ids.length === 0 ? [[], []] : await Promise.all([db.select().from(digitalProductImages).where(inArray(digitalProductImages.productId, ids)).orderBy(asc(digitalProductImages.sortOrder)), db.select().from(digitalProductFiles).where(inArray(digitalProductFiles.productId, ids)).orderBy(asc(digitalProductFiles.sortOrder))]);
  const previewsByProduct = new Map<number, StoredPreview[]>(); const filesByProduct = new Map<number, StoredFile[]>();
  for (const preview of previews) { const current = previewsByProduct.get(preview.productId) ?? []; current.push(preview); previewsByProduct.set(preview.productId, current); }
  for (const file of files) { const current = filesByProduct.get(file.productId) ?? []; current.push(file); filesByProduct.set(file.productId, current); }
  return records.map(({ product, category }) => mapProduct(product, category, previewsByProduct.get(product.id) ?? [], filesByProduct.get(product.id) ?? []));
}

async function categoryOrThrow(id: number) { const [category] = await db.select().from(digitalCategories).where(eq(digitalCategories.id, id)).limit(1); if (!category) throw new DownloadsNotFoundError("Categoría no encontrada"); return category; }
async function productOrThrow(id: number) { const [product] = await db.select().from(digitalProducts).where(eq(digitalProducts.id, id)).limit(1); if (!product) throw new DownloadsNotFoundError("Producto no encontrado"); return product; }
async function resolveProduct(id: number): Promise<DigitalProduct> { const [record] = await db.select({ product: digitalProducts, category: digitalCategories }).from(digitalProducts).innerJoin(digitalCategories, eq(digitalProducts.categoryId, digitalCategories.id)).where(eq(digitalProducts.id, id)).limit(1); if (!record) throw new DownloadsNotFoundError("Producto no encontrado"); const [previews, files] = await Promise.all([db.select().from(digitalProductImages).where(eq(digitalProductImages.productId, id)).orderBy(asc(digitalProductImages.sortOrder)), db.select().from(digitalProductFiles).where(eq(digitalProductFiles.productId, id)).orderBy(asc(digitalProductFiles.sortOrder))]); return mapProduct(record.product, record.category, previews, files); }

export async function createDigitalCategory(values: DigitalCategoryPayload) { try { const [category] = await db.insert(digitalCategories).values({ ...values, isPublished: false }).returning(); if (!category) throw new Error("Category creation failed"); return mapCategory(category, 0); } catch (error) { if (isUniqueViolation(error)) throw new DownloadsSlugConflictError("El slug de categoría ya existe"); throw error; } }
export async function updateDigitalCategory(id: number, values: DigitalCategoryPayload) { await categoryOrThrow(id); try { const [category] = await db.update(digitalCategories).set({ ...values, updatedAt: new Date() }).where(eq(digitalCategories.id, id)).returning(); if (!category) throw new DownloadsNotFoundError("Categoría no encontrada"); const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(digitalProducts).where(eq(digitalProducts.categoryId, id)); return mapCategory(category, count?.value ?? 0); } catch (error) { if (isUniqueViolation(error)) throw new DownloadsSlugConflictError("El slug de categoría ya existe"); throw error; } }
export async function deleteDigitalCategory(id: number) { await db.transaction(async (tx) => { const [category] = await tx.select({ id: digitalCategories.id }).from(digitalCategories).where(eq(digitalCategories.id, id)).limit(1); if (!category) throw new DownloadsNotFoundError("Categoría no encontrada"); const [product] = await tx.select({ id: digitalProducts.id }).from(digitalProducts).where(eq(digitalProducts.categoryId, id)).limit(1); if (product) throw new DownloadsCategoryInUseError("No puedes eliminar una categoría con productos"); await tx.delete(digitalCategories).where(eq(digitalCategories.id, id)); }); }
export async function createDigitalProduct(values: DigitalProductPayload) { await categoryOrThrow(values.categoryId); try { const [product] = await db.insert(digitalProducts).values({ ...values, currency: "USD", isPublished: false }).returning({ id: digitalProducts.id }); if (!product) throw new Error("Product creation failed"); return resolveProduct(product.id); } catch (error) { if (isUniqueViolation(error)) throw new DownloadsSlugConflictError("El slug de producto ya existe"); throw error; } }
export async function updateDigitalProduct(id: number, values: DigitalProductPayload) { await Promise.all([productOrThrow(id), categoryOrThrow(values.categoryId)]); try { await db.update(digitalProducts).set({ ...values, currency: "USD", updatedAt: new Date() }).where(eq(digitalProducts.id, id)); return resolveProduct(id); } catch (error) { if (isUniqueViolation(error)) throw new DownloadsSlugConflictError("El slug de producto ya existe"); throw error; } }
export async function deleteDigitalProduct(id: number): Promise<{ previewPaths: string[]; filePaths: string[] }> { return db.transaction(async (tx) => { await productOrThrow(id); const [orderItem] = await tx.select({ id: digitalOrderItems.id }).from(digitalOrderItems).where(eq(digitalOrderItems.productId, id)).limit(1); if (orderItem) throw new DownloadsProductHistoryError("No puedes eliminar un producto con historial de pedidos; ocultalo como borrador."); const [previews, files] = await Promise.all([tx.select({ storagePath: digitalProductImages.storagePath }).from(digitalProductImages).where(eq(digitalProductImages.productId, id)), tx.select({ storagePath: digitalProductFiles.storagePath }).from(digitalProductFiles).where(eq(digitalProductFiles.productId, id))]); await tx.delete(digitalProducts).where(eq(digitalProducts.id, id)); return { previewPaths: previews.map((image) => image.storagePath), filePaths: files.map((file) => file.storagePath) }; }); }

export async function replaceDigitalProductPreviews(id: number, previews: DigitalPreviewPayload[]) { const removedStoragePaths = await db.transaction(async (tx) => { await productOrThrow(id); const current = await tx.select().from(digitalProductImages).where(eq(digitalProductImages.productId, id)); const nextPaths = new Set(previews.map((preview) => preview.storagePath)); await tx.delete(digitalProductImages).where(eq(digitalProductImages.productId, id)); if (previews.length > 0) await tx.insert(digitalProductImages).values(previews.map((preview) => ({ productId: id, storagePath: preview.storagePath, altText: preview.altText, sortOrder: preview.sortOrder, isPrimary: preview.isPrimary }))); return current.filter((preview) => !nextPaths.has(preview.storagePath)).map((preview) => preview.storagePath); }); return { product: await resolveProduct(id), removedStoragePaths }; }
export async function replaceDigitalProductFiles(id: number, files: DigitalFilePayload[]) { const removedStoragePaths = await db.transaction(async (tx) => { await productOrThrow(id); const current = await tx.select().from(digitalProductFiles).where(eq(digitalProductFiles.productId, id)); const nextPaths = new Set(files.map((file) => file.storagePath)); await tx.delete(digitalProductFiles).where(eq(digitalProductFiles.productId, id)); if (files.length > 0) await tx.insert(digitalProductFiles).values(files.map((file) => ({ productId: id, storagePath: file.storagePath, originalName: file.originalName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, sortOrder: file.sortOrder }))); return current.filter((file) => !nextPaths.has(file.storagePath)).map((file) => file.storagePath); }); return { product: await resolveProduct(id), removedStoragePaths }; }

export async function listDigitalOrders(): Promise<DigitalOrderSummary[]> { const rows = await db.select({ order: digitalOrders, item: digitalOrderItems }).from(digitalOrders).innerJoin(digitalOrderItems, eq(digitalOrderItems.orderId, digitalOrders.id)).orderBy(sql`${digitalOrders.createdAt} desc`); return rows.map(({ order, item }) => ({ publicId: order.publicId, customerEmail: order.customerEmail, customerName: order.customerName, paymentMethod: order.paymentMethod as DigitalOrderSummary["paymentMethod"], status: order.status as DigitalOrderStatus, totalCents: order.totalCents, currency: "USD", productName: item.productNameSnapshot, createdAt: order.createdAt.toISOString(), paidAt: order.paidAt?.toISOString() ?? null })); }
export async function updateBankTransferOrderStatus(publicId: string, nextStatus: DigitalOrderStatus) { const [order] = await db.select().from(digitalOrders).where(eq(digitalOrders.publicId, publicId)).limit(1); if (!order) throw new DownloadsNotFoundError("Pedido no encontrado"); if (order.paymentMethod !== "bank_transfer") throw new DownloadsValidationError("Los pedidos PayPal se confirman únicamente mediante captura verificada"); const allowed = (order.status === "pending_payment" && ["payment_review", "paid", "cancelled"].includes(nextStatus)) || (order.status === "payment_review" && ["paid", "cancelled"].includes(nextStatus)); if (!allowed) throw new DownloadsValidationError("Transición de estado no permitida"); const [updated] = await db.update(digitalOrders).set({ status: nextStatus, paidAt: nextStatus === "paid" ? new Date() : order.paidAt, updatedAt: new Date() }).where(eq(digitalOrders.id, order.id)).returning(); return updated; }
export function parseRouteId(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new DownloadsValidationError("Identificador inválido"); return id; }
