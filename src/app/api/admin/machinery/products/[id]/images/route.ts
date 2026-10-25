import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  MachineryNotFoundError,
  MachineryValidationError,
  parseMachineryImagePayloads,
  parseRouteId,
  replaceMachineryProductImages,
} from "@/lib/admin-machinery";
import { removeMachineryImageObjects } from "@/lib/machinery-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await replaceMachineryProductImages(
      parseRouteId(id),
      parseMachineryImagePayloads(await request.json()),
    );
    try {
      await removeMachineryImageObjects(result.removedStoragePaths);
    } catch (error) {
      console.error("[machinery-images] orphan image cleanup failed", error);
    }
    return NextResponse.json({ product: result.product });
  } catch (error) {
    if (error instanceof MachineryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof MachineryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[machinery-images] update failed", error);
    return NextResponse.json({ error: "No fue posible actualizar las imágenes" }, { status: 500 });
  }
}
