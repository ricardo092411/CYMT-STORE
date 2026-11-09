import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  createSignedInkLandingUpload,
  InkMediaUploadValidationError,
} from "@/lib/ink-media-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await createSignedInkLandingUpload(await request.json()));
  } catch (error) {
    if (error instanceof InkMediaUploadValidationError) {
      return NextResponse.json({ error: "Datos de portada inválidos" }, { status: 400 });
    }
    console.error("[ink-landing-upload] signed upload authorization failed");
    return NextResponse.json({ error: "No fue posible autorizar la subida de portada" }, { status: 502 });
  }
}
