import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  InkNotFoundError,
  InkValidationError,
  parseInkImagePayloads,
  parseRouteId,
  replaceInkProductImages,
} from "@/lib/admin-inks";
import { removeInkImageObjects } from "@/lib/ink-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await replaceInkProductImages(parseRouteId(id), parseInkImagePayloads(await request.json()));
    try {
      await removeInkImageObjects(result.removedStoragePaths);
    } catch (error) {
      console.error("[ink-images] orphan image cleanup failed", error);
    }
    return NextResponse.json({ product: result.product });
  } catch (error) {
    if (error instanceof InkValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof InkNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[ink-images] update failed", error);
    return NextResponse.json({ error: "No fue posible actualizar las imágenes" }, { status: 500 });
  }
}
