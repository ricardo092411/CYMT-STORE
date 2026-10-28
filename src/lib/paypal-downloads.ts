import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { digitalOrders } from "@/db/schema";
import { DigitalOrderAuthorizationError, DigitalOrderNotFoundError, DigitalOrderValidationError, getAuthorizedDigitalOrder } from "@/lib/digital-orders";

type PaypalConfig = { clientId: string; secret: string; baseUrl: string };

function config(): PaypalConfig | null { const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim(); const secret = process.env.PAYPAL_CLIENT_SECRET?.trim(); const environment = process.env.PAYPAL_ENV; if (!clientId || !secret || (environment !== "sandbox" && environment !== "live")) return null; return { clientId, secret, baseUrl: environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com" }; }
export function paypalAvailable() { const current = config(); return current ? { clientId: current.clientId } : null; }
function centsToAmount(cents: number) { return (cents / 100).toFixed(2); }
function amountToCents(value: unknown) { if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null; const [whole, fraction = ""] = value.split("."); return Number(whole) * 100 + Number((fraction + "00").slice(0, 2)); }
async function accessToken(current: PaypalConfig) { const response = await fetch(`${current.baseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${current.clientId}:${current.secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" }); if (!response.ok) throw new Error("PayPal authorization failed"); const body: unknown = await response.json(); if (typeof body !== "object" || body === null || typeof (body as { access_token?: unknown }).access_token !== "string") throw new Error("PayPal authorization response invalid"); return (body as { access_token: string }).access_token; }

export async function createPaypalOrder(publicId: string, token: string) {
  const current = config(); if (!current) throw new DigitalOrderValidationError("PayPal no está configurado");
  const { order } = await getAuthorizedDigitalOrder(publicId, token);
  if (order.paymentMethod !== "paypal" || order.status !== "pending_payment") throw new DigitalOrderAuthorizationError("Este pedido no está disponible para PayPal");
  if (order.paypalOrderId) return { paypalOrderId: order.paypalOrderId, clientId: current.clientId };
  const bearer = await accessToken(current);
  const response = await fetch(`${current.baseUrl}/v2/checkout/orders`, { method: "POST", headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", "PayPal-Request-Id": `downloads-create-${order.publicId}` }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ reference_id: order.publicId, amount: { currency_code: "USD", value: centsToAmount(order.totalCents) } }] }), cache: "no-store" });
  if (!response.ok) throw new Error("PayPal order creation failed"); const body: unknown = await response.json(); const paypalOrderId = typeof body === "object" && body !== null && typeof (body as { id?: unknown }).id === "string" ? (body as { id: string }).id : null; if (!paypalOrderId) throw new Error("PayPal order response invalid");
  await db.update(digitalOrders).set({ paypalOrderId, updatedAt: new Date() }).where(eq(digitalOrders.id, order.id)); return { paypalOrderId, clientId: current.clientId };
}

export async function capturePaypalOrder(publicId: string, token: string) {
  const current = config(); if (!current) throw new DigitalOrderAuthorizationError("PayPal no está configurado"); const { order } = await getAuthorizedDigitalOrder(publicId, token);
  if (order.status === "paid") return { status: "paid" as const };
  if (order.paymentMethod !== "paypal" || order.status !== "pending_payment" || !order.paypalOrderId) throw new DigitalOrderAuthorizationError("Este pedido no está listo para captura");
  const bearer = await accessToken(current); const response = await fetch(`${current.baseUrl}/v2/checkout/orders/${encodeURIComponent(order.paypalOrderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json", "PayPal-Request-Id": `downloads-capture-${order.publicId}` }, cache: "no-store" }); if (!response.ok) throw new Error("PayPal capture failed");
  const body: unknown = await response.json(); const record = body as { status?: unknown; purchase_units?: Array<{ payments?: { captures?: Array<{ id?: unknown; status?: unknown; amount?: { currency_code?: unknown; value?: unknown } }> } }> }; const capture = record.purchase_units?.[0]?.payments?.captures?.[0]; const captureId = typeof capture?.id === "string" ? capture.id.trim() : null; const amount = amountToCents(capture?.amount?.value); if (record.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !captureId || capture.amount?.currency_code !== "USD" || amount !== order.totalCents) throw new Error("PayPal capture verification failed");
  try { await db.transaction(async (tx) => { const [fresh] = await tx.select().from(digitalOrders).where(eq(digitalOrders.id, order.id)).limit(1); if (!fresh) throw new DigitalOrderNotFoundError("Pedido no encontrado"); if (fresh.status === "paid") return; await tx.update(digitalOrders).set({ status: "paid", paypalCaptureId: captureId, paidAt: new Date(), updatedAt: new Date() }).where(eq(digitalOrders.id, fresh.id)); }); } catch (error) { if (error instanceof DigitalOrderNotFoundError) throw error; throw new Error("PayPal capture could not be recorded"); }
  return { status: "paid" as const };
}
