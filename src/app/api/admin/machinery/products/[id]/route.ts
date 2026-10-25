import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  deleteMachineryProduct,
  MachineryNotFoundError,
  MachinerySlugConflictError,
  MachineryValidationError,
  parseMachineryProductPayload,
  parseRouteId,
  updateMachineryProduct,
} from "@/lib/admin-machinery";
import { removeMachineryImageObjects } from "@/lib/machinery-image-storage";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof MachineryValidationError || error instanceof MachinerySlugConflictError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof MachineryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error("[machinery-product] mutation failed", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { id } = await params;
    const product = await updateMachineryProduct(
      parseRouteId(id),
      parseMachineryProductPayload(await request.json()),
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
    const storagePaths = await deleteMachineryProduct(parseRouteId(id));
    try {
      await removeMachineryImageObjects(storagePaths);
    } catch (error) {
      console.error("[machinery-product] orphan image cleanup failed", error);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "No fue posible eliminar el producto");
  }
}
