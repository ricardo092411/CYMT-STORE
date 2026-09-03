import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createSignedProductImageUpload,
  ProductImageUploadValidationError,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos de imagen inválidos" }, { status: 400 });
  }

  try {
    return NextResponse.json(await createSignedProductImageUpload(body));
  } catch (error) {
    if (error instanceof ProductImageUploadValidationError) {
      return NextResponse.json({ error: "Datos de imagen inválidos" }, { status: 400 });
    }

    console.error("[product-image-upload] signed upload authorization failed");
    return NextResponse.json(
      { error: "No fue posible autorizar la subida de imagen" },
      { status: 502 },
    );
  }
}
