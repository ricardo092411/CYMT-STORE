import { NextResponse } from "next/server";
import {
  ConfectionSlugConflictError,
  ConfectionValidationError,
  createConfectionProduct,
  getConfectionMetrics,
  listConfectionProducts,
  parseConfectionProductPayload,
} from "@/lib/admin-confection";
import { isAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const [products, metrics] = await Promise.all([listConfectionProducts(), getConfectionMetrics()]);
    return NextResponse.json({ products, metrics });
  } catch (error) {
    console.error("[confection-products] list failed", error);
    return NextResponse.json({ error: "No fue posible cargar los productos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const product = await createConfectionProduct(parseConfectionProductPayload(await request.json()));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof ConfectionValidationError || error instanceof ConfectionSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[confection-products] create failed", error);
    return NextResponse.json({ error: "No fue posible crear el producto" }, { status: 500 });
  }
}
