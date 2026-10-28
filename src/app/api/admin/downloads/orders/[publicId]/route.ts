import { NextResponse } from "next/server";
import { DownloadsNotFoundError, DownloadsValidationError, updateBankTransferOrderStatus } from "@/lib/admin-downloads";
import { isAdmin } from "@/lib/auth/admin";
import type { DigitalOrderStatus } from "@/lib/downloads-types";
export const runtime = "nodejs";
type Context = { params: Promise<{ publicId: string }> };
export async function PATCH(request: Request, { params }: Context) { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { const body: unknown = await request.json(); const status = typeof body === "object" && body !== null ? (body as { status?: unknown }).status : null; if (status !== "payment_review" && status !== "paid" && status !== "cancelled") throw new DownloadsValidationError("Estado inválido"); const { publicId } = await params; await updateBankTransferOrderStatus(publicId, status as DigitalOrderStatus); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof DownloadsValidationError) return NextResponse.json({ error: error.message }, { status: 400 }); if (error instanceof DownloadsNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error("[downloads-order] update failed", error); return NextResponse.json({ error: "No fue posible actualizar el pedido" }, { status: 500 }); } }
