import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  getInkLandingSettings,
  InkValidationError,
  parseInkLandingSettingsPayload,
  updateInkLandingSettings,
} from "@/lib/admin-inks";
import { removeInkLandingObjects } from "@/lib/ink-media-storage";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ settings: await getInkLandingSettings() });
  } catch (error) {
    console.error("[ink-landing] read failed", error);
    return NextResponse.json({ error: "No fue posible cargar la portada de CMT Ink" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const result = await updateInkLandingSettings(
      parseInkLandingSettingsPayload(await request.json()),
    );
    try {
      await removeInkLandingObjects(result.removedStoragePaths);
    } catch (error) {
      console.error("[ink-landing] orphan hero cleanup failed", error);
    }
    return NextResponse.json({ settings: result.settings });
  } catch (error) {
    if (error instanceof InkValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[ink-landing] update failed", error);
    return NextResponse.json({ error: "No fue posible guardar la portada de CMT Ink" }, { status: 500 });
  }
}
