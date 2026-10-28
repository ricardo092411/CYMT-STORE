import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { createSignedInkImageUpload, InkImageUploadValidationError } from "@/lib/ink-image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos de imagen inválidos" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createSignedInkImageUpload(body));
  } catch (error) {
    if (error instanceof InkImageUploadValidationError) return NextResponse.json({ error: "Datos de imagen inválidos" }, { status: 400 });
    console.error("[ink-image-upload] signed upload authorization failed");
    return NextResponse.json({ error: "No fue posible autorizar la subida de imagen" }, { status: 502 });
  }
}
