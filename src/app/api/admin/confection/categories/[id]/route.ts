import { NextResponse } from "next/server";
import {
  ConfectionCategoryInUseError,
  ConfectionNotFoundError,
  ConfectionSlugConflictError,
  ConfectionValidationError,
  deleteConfectionCategory,
  parseConfectionCategoryPayload,
  parseRouteId,
  updateConfectionCategory,
} from "@/lib/admin-confection";
import { isAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ConfectionValidationError || error instanceof ConfectionSlugConflictError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ConfectionCategoryInUseError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ConfectionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error("[confection-category] mutation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const category = await updateConfectionCategory(
      parseRouteId(id),
      parseConfectionCategoryPayload(await request.json()),
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
    await deleteConfectionCategory(parseRouteId(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "No fue posible eliminar la categoría");
  }
}
