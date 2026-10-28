import { NextResponse } from "next/server";
import { DigitalOrderAuthorizationError, DigitalOrderNotFoundError, getDigitalOrderView, parseOrderAccess } from "@/lib/digital-orders";
export const runtime = "nodejs";
type Context = { params: Promise<{ publicId: string }> };
export async function POST(request: Request, { params }: Context) { try { const { publicId } = await params; return NextResponse.json({ order: await getDigitalOrderView(publicId, parseOrderAccess(await request.json())) }); } catch (error) { if (error instanceof DigitalOrderAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 }); if (error instanceof DigitalOrderNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error("[digital-order-access] failed", error); return NextResponse.json({ error: "No fue posible acceder al pedido" }, { status: 400 }); } }
