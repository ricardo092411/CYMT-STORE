import { NextResponse } from "next/server";
import { listDigitalOrders } from "@/lib/admin-downloads";
import { isAdmin } from "@/lib/auth/admin";
export const runtime = "nodejs";
export async function GET() { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { return NextResponse.json({ orders: await listDigitalOrders() }); } catch (error) { console.error("[downloads-orders] list failed", error); return NextResponse.json({ error: "No fue posible cargar los pedidos" }, { status: 500 }); } }
