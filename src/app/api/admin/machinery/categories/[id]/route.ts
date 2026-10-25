import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  deleteMachineryCategory,
  MachineryCategoryInUseError,
  MachineryNotFoundError,
  MachinerySlugConflictError,
  MachineryValidationError,
  parseMachineryCategoryPayload,
  parseRouteId,
  updateMachineryCategory,
} from "@/lib/admin-machinery";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof MachineryValidationError || error instanceof MachinerySlugConflictError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof MachineryCategoryInUseError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof MachineryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error("[machinery-category] mutation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const category = await updateMachineryCategory(
      parseRouteId(id),
      parseMachineryCategoryPayload(await request.json()),
    );
    return NextResponse.json({ category });
  } catch (error) {
    return errorResponse(error, "No fue posible actualizar la categoría");
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    await deleteMachineryCategory(parseRouteId(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "No fue posible eliminar la categoría");
  }
}
