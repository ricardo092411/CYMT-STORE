import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createInkProduct,
  getInkMetrics,
  InkSlugConflictError,
  InkValidationError,
  listInkProducts,
  parseInkProductPayload,
} from "@/lib/admin-inks";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const [products, metrics] = await Promise.all([listInkProducts(), getInkMetrics()]);
    return NextResponse.json({ products, metrics });
  } catch (error) {
    console.error("[ink-products] list failed", error);
    return NextResponse.json({ error: "No fue posible cargar CMT Ink" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const product = await createInkProduct(parseInkProductPayload(await request.json()));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof InkValidationError || error instanceof InkSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[ink-products] create failed", error);
    return NextResponse.json({ error: "No fue posible crear el producto CMT Ink" }, { status: 500 });
  }
}
