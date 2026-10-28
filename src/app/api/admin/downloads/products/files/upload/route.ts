import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { createSignedDigitalFileUpload, DownloadsFileUploadValidationError } from "@/lib/downloads-file-storage";
export const runtime = "nodejs";
export async function POST(request: Request) { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { return NextResponse.json(await createSignedDigitalFileUpload(await request.json())); } catch (error) { if (error instanceof DownloadsFileUploadValidationError) return NextResponse.json({ error: "Datos de archivo inválidos" }, { status: 400 }); console.error("[downloads-file-upload] authorization failed"); return NextResponse.json({ error: "No fue posible autorizar el archivo" }, { status: 502 }); } }
