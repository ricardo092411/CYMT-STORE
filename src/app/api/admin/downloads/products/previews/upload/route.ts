import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { createSignedDownloadsPreviewUpload, DownloadsPreviewUploadValidationError } from "@/lib/downloads-preview-storage";
export const runtime = "nodejs";
export async function POST(request: Request) { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { return NextResponse.json(await createSignedDownloadsPreviewUpload(await request.json())); } catch (error) { if (error instanceof DownloadsPreviewUploadValidationError) return NextResponse.json({ error: "Datos de preview inválidos" }, { status: 400 }); console.error("[downloads-preview-upload] authorization failed"); return NextResponse.json({ error: "No fue posible autorizar el preview" }, { status: 502 }); } }
