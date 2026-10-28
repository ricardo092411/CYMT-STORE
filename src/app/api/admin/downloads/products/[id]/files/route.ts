import { NextResponse } from "next/server";
import { DownloadsNotFoundError, DownloadsValidationError, parseDigitalFilePayloads, parseRouteId, replaceDigitalProductFiles } from "@/lib/admin-downloads";
import { isAdmin } from "@/lib/auth/admin";
import { removeDigitalFileObjects } from "@/lib/downloads-file-storage";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { const { id } = await params; const result = await replaceDigitalProductFiles(parseRouteId(id), parseDigitalFilePayloads(await request.json())); try { await removeDigitalFileObjects(result.removedStoragePaths); } catch (error) { console.error("[downloads-files] orphan cleanup failed", error); } return NextResponse.json({ product: result.product }); } catch (error) { if (error instanceof DownloadsValidationError) return NextResponse.json({ error: error.message }, { status: 400 }); if (error instanceof DownloadsNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error("[downloads-files] update failed", error); return NextResponse.json({ error: "No fue posible actualizar los archivos" }, { status: 500 }); } }
