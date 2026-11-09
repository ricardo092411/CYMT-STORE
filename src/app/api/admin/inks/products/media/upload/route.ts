import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createSignedInkShowcaseUpload,
  InkMediaUploadValidationError,
} from "@/lib/ink-media-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await createSignedInkShowcaseUpload(await request.json()));
  } catch (error) {
    if (error instanceof InkMediaUploadValidationError) {
      return NextResponse.json({ error: "Datos de muestra inválidos" }, { status: 400 });
    }
    console.error("[ink-showcase-upload] signed upload authorization failed");
    return NextResponse.json({ error: "No fue posible autorizar la subida de muestra" }, { status: 502 });
  }
}
