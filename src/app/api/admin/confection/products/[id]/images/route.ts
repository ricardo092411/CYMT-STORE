import { NextResponse } from "next/server";
import {
  ConfectionNotFoundError,
  ConfectionValidationError,
  parseConfectionImagePayloads,
  parseRouteId,
  replaceConfectionProductImages,
} from "@/lib/admin-confection";
import { isAdmin } from "@/lib/auth/admin";
import { removeConfectionImageObjects } from "@/lib/confection-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await replaceConfectionProductImages(
      parseRouteId(id),
      parseConfectionImagePayloads(await request.json()),
    );
    try {
      await removeConfectionImageObjects(result.removedStoragePaths);
    } catch (error) {
      console.error("[confection-images] orphan image cleanup failed", error);
    }
    return NextResponse.json({ product: result.product });
  } catch (error) {
    if (error instanceof ConfectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ConfectionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[confection-images] update failed", error);
    return NextResponse.json({ error: "No fue posible actualizar las imágenes" }, { status: 500 });
  }
}
