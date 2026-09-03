import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  getHomeHeroRead,
  HomeHeroTableUnavailableError,
  updateHomeHeroContent,
} from "@/lib/home-hero";
import type { HomeHeroContent } from "@/types/home-hero";

export const dynamic = "force-dynamic";

const HERO_CONTENT_FIELDS = [
  "badge",
  "titlePrefix",
  "titleHighlight",
  "description",
  "primaryLabel",
  "primaryHref",
  "secondaryLabel",
  "imageAlt",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStrictFields(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === HERO_CONTENT_FIELDS.length &&
    HERO_CONTENT_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(value, field)) &&
    keys.every((field) => HERO_CONTENT_FIELDS.includes(field as typeof HERO_CONTENT_FIELDS[number]))
  );
}

function trimmedString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maximumLength ? trimmed : null;
}

function internalHref(value: unknown): string | null {
  const href = trimmedString(value, 300);
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  if (href.includes("\\") || /[\u0000-\u001f\u007f]/.test(href)) return null;
  return href;
}

function parseHeroContent(body: unknown): HomeHeroContent | null {
  if (!isRecord(body) || !hasStrictFields(body)) return null;

  const badge = trimmedString(body.badge, 160);
  const titlePrefix = trimmedString(body.titlePrefix, 180);
  const titleHighlight = trimmedString(body.titleHighlight, 180);
  const description = trimmedString(body.description, 1_000);
  const primaryLabel = trimmedString(body.primaryLabel, 80);
  const primaryHref = internalHref(body.primaryHref);
  const secondaryLabel = trimmedString(body.secondaryLabel, 80);
  const imageAlt = trimmedString(body.imageAlt, 200);

  return (
    badge &&
    titlePrefix &&
    titleHighlight &&
    description &&
    primaryLabel &&
    primaryHref &&
    secondaryLabel &&
    imageAlt
  )
    ? {
        badge,
        titlePrefix,
        titleHighlight,
        description,
        primaryLabel,
        primaryHref,
        secondaryLabel,
        imageAlt,
      }
    : null;
}

function hasJsonContentType(request: Request): boolean {
  return request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

async function readJson(request: Request): Promise<unknown | null> {
  if (!hasJsonContentType(request)) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function writeErrorResponse(error: unknown) {
  if (error instanceof HomeHeroTableUnavailableError) {
    return NextResponse.json(
      { error: "La configuración del Hero aún no está disponible. Aplica el SQL de bootstrap." },
      { status: 500 },
    );
  }

  console.error("[home-hero] content write failed");
  return NextResponse.json({ error: "No fue posible guardar el Hero" }, { status: 500 });
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getHomeHeroRead());
  } catch {
    console.error("[home-hero] read failed");
    return NextResponse.json({ error: "No fue posible obtener el Hero" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const values = parseHeroContent(await readJson(request));
  if (!values) return NextResponse.json({ error: "Datos de Hero inválidos" }, { status: 400 });

  try {
    await updateHomeHeroContent(values);
    const confirmed = await getHomeHeroRead();
    if (confirmed.source !== "database") throw new Error("Home Hero update could not be confirmed");

    revalidatePath("/");
    return NextResponse.json(confirmed);
  } catch (error) {
    return writeErrorResponse(error);
  }
}
