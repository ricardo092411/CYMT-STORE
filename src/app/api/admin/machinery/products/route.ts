import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createMachineryProduct,
  getMachineryMetrics,
  listMachineryProducts,
  MachinerySlugConflictError,
  MachineryValidationError,
  parseMachineryProductPayload,
} from "@/lib/admin-machinery";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const [products, metrics] = await Promise.all([listMachineryProducts(), getMachineryMetrics()]);
    return NextResponse.json({ products, metrics });
  } catch (error) {
    console.error("[machinery-products] list failed", error);
    return NextResponse.json({ error: "No fue posible cargar la maquinaria" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const product = await createMachineryProduct(parseMachineryProductPayload(await request.json()));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof MachineryValidationError || error instanceof MachinerySlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[machinery-products] create failed", error);
    return NextResponse.json({ error: "No fue posible crear el producto" }, { status: 500 });
  }
}
