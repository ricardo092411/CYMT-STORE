import { NextResponse } from "next/server";
import { createDigitalOrder, DigitalOrderNotFoundError, DigitalOrderValidationError } from "@/lib/digital-orders";
export const runtime = "nodejs";
export async function POST(request: Request) { try { return NextResponse.json(await createDigitalOrder(await request.json()), { status: 201 }); } catch (error) { if (error instanceof DigitalOrderValidationError || error instanceof DigitalOrderNotFoundError) return NextResponse.json({ error: error.message }, { status: 400 }); console.error("[digital-orders] create failed", error); return NextResponse.json({ error: "No fue posible crear el pedido" }, { status: 500 }); } }
