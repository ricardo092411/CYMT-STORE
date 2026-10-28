import { NextResponse } from "next/server";
import { DownloadsNotFoundError, DownloadsValidationError, parseDigitalPreviewPayloads, parseRouteId, replaceDigitalProductPreviews } from "@/lib/admin-downloads";
import { isAdmin } from "@/lib/auth/admin";
import { removeDownloadsPreviewObjects } from "@/lib/downloads-preview-storage";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) { if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 }); try { const { id } = await params; const result = await replaceDigitalProductPreviews(parseRouteId(id), parseDigitalPreviewPayloads(await request.json())); try { await removeDownloadsPreviewObjects(result.removedStoragePaths); } catch (error) { console.error("[downloads-previews] orphan cleanup failed", error); } return NextResponse.json({ product: result.product }); } catch (error) { if (error instanceof DownloadsValidationError) return NextResponse.json({ error: error.message }, { status: 400 }); if (error instanceof DownloadsNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error("[downloads-previews] update failed", error); return NextResponse.json({ error: "No fue posible actualizar los previews" }, { status: 500 }); } }
