import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  InkNotFoundError,
  InkValidationError,
  parseInkProductMediaPayloads,
  parseRouteId,
  replaceInkProductMedia,
} from "@/lib/admin-inks";
import { removeInkShowcaseObjects } from "@/lib/ink-media-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await replaceInkProductMedia(
      parseRouteId(id),
      parseInkProductMediaPayloads(await request.json()),
    );
    try {
      await removeInkShowcaseObjects(result.removedStoragePaths);
    } catch (error) {
      console.error("[ink-showcase] orphan media cleanup failed", error);
    }
    return NextResponse.json({ product: result.product });
  } catch (error) {
    if (error instanceof InkValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof InkNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[ink-showcase] update failed", error);
    return NextResponse.json({ error: "No fue posible guardar las muestras" }, { status: 500 });
  }
}
