import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import {
  AdminDropNotFoundError,
  AdminDropSlugConflictError,
  createAdminDrop,
  updateAdminDrop,
  type AdminDropWriteValues,
} from "@/lib/admin-drops";
import { getDropBySlug, getDrops } from "@/lib/drops";

const CREATE_FIELDS = ["name", "slug", "title", "description", "theme", "live", "releaseDate"] as const;
const PATCH_FIELDS = ["currentSlug", ...CREATE_FIELDS] as const;

type DropRequestValues = AdminDropWriteValues & { currentSlug?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOnlyFields(value: Record<string, unknown>, allowedFields: readonly string[]): boolean {
  return Object.keys(value).every((field) => allowedFields.includes(field));
}

function hasAllFields(value: Record<string, unknown>, requiredFields: readonly string[]): boolean {
  return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function requiredTrimmedString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maximumLength ? trimmed : null;
}

function nullableTrimmedString(value: unknown, maximumLength: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maximumLength ? trimmed || null : undefined;
}

function technicalSlug(value: unknown): string | null {
  const slug = requiredTrimmedString(value, 120);
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function dateOnly(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

function parseDropValues(
  body: unknown,
  includeCurrentSlug: boolean,
): DropRequestValues | null {
  const allowedFields = includeCurrentSlug ? PATCH_FIELDS : CREATE_FIELDS;
  if (!isRecord(body) || !hasOnlyFields(body, allowedFields) || !hasAllFields(body, allowedFields)) {
    return null;
  }

  const name = requiredTrimmedString(body.name, 120);
  const slug = technicalSlug(body.slug);
  const title = nullableTrimmedString(body.title, 200);
  const description = nullableTrimmedString(body.description, 5_000);
  const theme = nullableTrimmedString(body.theme, 40);
  const releaseDate = dateOnly(body.releaseDate);
  if (
    !name ||
    !slug ||
    title === undefined ||
    description === undefined ||
    theme === undefined ||
    releaseDate === undefined ||
    typeof body.live !== "boolean"
  ) {
    return null;
  }

  if (!includeCurrentSlug) {
    return { name, slug, title, description, theme, live: body.live, releaseDate };
  }

  const currentSlug = technicalSlug(body.currentSlug);
  return currentSlug
    ? { currentSlug, name, slug, title, description, theme, live: body.live, releaseDate }
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

function revalidateDropPaths(slug: string, previousSlug: string | null): void {
  revalidatePath("/");
  revalidatePath("/tienda");
  revalidatePath(`/drop/${slug}`);
  revalidatePath("/sitemap.xml");
  if (previousSlug && previousSlug !== slug) revalidatePath(`/drop/${previousSlug}`);
}

function errorResponse(error: unknown) {
  if (error instanceof AdminDropNotFoundError) {
    return NextResponse.json({ error: "Drop no encontrado" }, { status: 404 });
  }
  if (error instanceof AdminDropSlugConflictError) {
    return NextResponse.json({ error: "El slug ya pertenece a otro Drop" }, { status: 409 });
  }

  console.error("[admin-drops] write failed");
  return NextResponse.json({ error: "No fue posible guardar el Drop" }, { status: 500 });
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDrops());
  } catch {
    console.error("[admin-drops] read failed");
    return NextResponse.json({ error: "No fue posible obtener los Drops" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const values = parseDropValues(await readJson(request), false);
  if (!values) return NextResponse.json({ error: "Datos de Drop inválidos" }, { status: 400 });

  try {
    const created = await createAdminDrop(values);
    const drop = await getDropBySlug(created.slug);
    if (!drop) throw new Error("Created drop could not be read");

    revalidateDropPaths(drop.slug, null);
    return NextResponse.json({ drop }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const values = parseDropValues(await readJson(request), true);
  if (!values?.currentSlug) return NextResponse.json({ error: "Datos de Drop inválidos" }, { status: 400 });
  const { currentSlug, ...writeValues } = values;

  try {
    const updated = await updateAdminDrop(currentSlug, writeValues);
    const drop = await getDropBySlug(updated.slug);
    if (!drop) throw new Error("Updated drop could not be read");

    revalidateDropPaths(drop.slug, updated.previousSlug);
    return NextResponse.json({ drop });
  } catch (error) {
    return errorResponse(error);
  }
}
