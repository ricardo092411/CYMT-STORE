import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  deleteInkProduct,
  InkNotFoundError,
  InkSlugConflictError,
  InkValidationError,
  parseInkProductPayload,
  parseRouteId,
  updateInkProduct,
} from "@/lib/admin-inks";
import { removeInkImageObjects } from "@/lib/ink-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof InkValidationError || error instanceof InkSlugConflictError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof InkNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  console.error("[ink-product] mutation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json({ product: await updateInkProduct(parseRouteId(id), parseInkProductPayload(await request.json())) });
  } catch (error) {
    return errorResponse(error, "No fue posible actualizar CMT Ink");
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const storagePaths = await deleteInkProduct(parseRouteId(id));
    try {
      await removeInkImageObjects(storagePaths);
    } catch (error) {
      console.error("[ink-product] orphan image cleanup failed", error);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "No fue posible eliminar CMT Ink");
  }
}
