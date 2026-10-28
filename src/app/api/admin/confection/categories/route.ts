import { NextResponse } from "next/server";
import {
  ConfectionSlugConflictError,
  ConfectionValidationError,
  createConfectionCategory,
  listConfectionCategories,
  parseConfectionCategoryPayload,
} from "@/lib/admin-confection";
import { isAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ categories: await listConfectionCategories() });
  } catch (error) {
    console.error("[confection-categories] list failed", error);
    return NextResponse.json({ error: "No fue posible cargar las categorías" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const category = await createConfectionCategory(parseConfectionCategoryPayload(await request.json()));
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof ConfectionValidationError || error instanceof ConfectionSlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[confection-categories] create failed", error);
    return NextResponse.json({ error: "No fue posible crear la categoría" }, { status: 500 });
  }
}
