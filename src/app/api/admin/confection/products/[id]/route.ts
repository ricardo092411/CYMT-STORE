import { NextResponse } from "next/server";
import {
  ConfectionNotFoundError,
  ConfectionSlugConflictError,
  ConfectionValidationError,
  deleteConfectionProduct,
  parseConfectionProductPayload,
  parseRouteId,
  updateConfectionProduct,
} from "@/lib/admin-confection";
import { isAdmin } from "@/lib/auth/admin";
import { removeConfectionImageObjects } from "@/lib/confection-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ConfectionValidationError || error instanceof ConfectionSlugConflictError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ConfectionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error("[confection-product] mutation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const product = await updateConfectionProduct(
      parseRouteId(id),
      parseConfectionProductPayload(await request.json()),
    );
    return NextResponse.json({ product });
  } catch (error) {
    return errorResponse(error, "No fue posible actualizar el producto");
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const storagePaths = await deleteConfectionProduct(parseRouteId(id));
    try {
      await removeConfectionImageObjects(storagePaths);
    } catch (error) {
      console.error("[confection-product] orphan image cleanup failed", error);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "No fue posible eliminar el producto");
  }
}
