import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createMachineryCategory,
  listMachineryCategories,
  MachinerySlugConflictError,
  MachineryValidationError,
  parseMachineryCategoryPayload,
} from "@/lib/admin-machinery";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ categories: await listMachineryCategories() });
  } catch (error) {
    console.error("[machinery-categories] list failed", error);
    return NextResponse.json({ error: "No fue posible cargar las categorías" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ category: await createMachineryCategory(parseMachineryCategoryPayload(await request.json())) }, { status: 201 });
  } catch (error) {
    if (error instanceof MachineryValidationError || error instanceof MachinerySlugConflictError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[machinery-categories] create failed", error);
    return NextResponse.json({ error: "No fue posible crear la categoría" }, { status: 500 });
  }
}
