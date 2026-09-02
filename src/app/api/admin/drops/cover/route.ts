import { isAdmin } from "@/lib/auth/admin";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { drops } from "@/db/schema";
import {
  createDropCoverStorageKey,
  deleteDropCover,
  getManagedDropCoverStorageKey,
  uploadDropCover,
} from "@/lib/drop-cover-storage";
import { getDropBySlug } from "@/lib/drops";

export const runtime = "nodejs";

const MAX_DROP_COVER_BYTES = 5 * 1024 * 1024;

type ImageSignature = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filenameExtensions: readonly string[];
};

const IMAGE_SIGNATURES: readonly ImageSignature[] = [
  { mime: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"] },
  { mime: "image/png", extension: "png", filenameExtensions: ["png"] },
  { mime: "image/webp", extension: "webp", filenameExtensions: ["webp"] },
];

function filenameExtension(filename: string): string | null {
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  return extension || null;
}

function startsWithBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((byte, index) => bytes[index] === byte);
}

function detectImageSignature(bytes: Uint8Array): ImageSignature | null {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return IMAGE_SIGNATURES[0];
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return IMAGE_SIGNATURES[1];
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWithBytes(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return IMAGE_SIGNATURES[2];
  }

  return null;
}

async function validateImageFile(file: File): Promise<ImageSignature | null> {
  if (file.size <= 0 || file.size > MAX_DROP_COVER_BYTES) return null;

  const signature = detectImageSignature(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!signature) return null;

  const extension = filenameExtension(file.name);
  if (!extension || !signature.filenameExtensions.includes(extension) || file.type !== signature.mime) {
    return null;
  }

  return signature;
}

function toSlug(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return slug && slug === value && slug.length <= 120 ? slug : null;
}

function toFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File ? value : null;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 },
    );
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario de carátula inválido" }, { status: 400 });
  }

  const slug = toSlug(formData.get("slug"));
  if (!slug) {
    return NextResponse.json({ error: "Slug de Drop inválido" }, { status: 400 });
  }

  const existingRows = await db
    .select({ slug: drops.slug, banner: drops.banner })
    .from(drops)
    .where(eq(drops.slug, slug))
    .limit(1);
  const existingDrop = existingRows[0];
  if (!existingDrop) {
    return NextResponse.json({ error: "Drop no encontrado" }, { status: 404 });
  }

  const file = toFile(formData.get("file"));
  if (!file) {
    return NextResponse.json({ error: "Selecciona una imagen para la carátula" }, { status: 400 });
  }

  const signature = await validateImageFile(file);
  if (!signature) {
    return NextResponse.json(
      { error: "La carátula debe ser JPEG, PNG o WebP válido de hasta 5 MB" },
      { status: 400 },
    );
  }

  const storageKey = createDropCoverStorageKey(existingDrop.slug, signature.extension);
  let uploadedCover;
  try {
    uploadedCover = await uploadDropCover({ storageKey, file });
  } catch {
    console.error("[drop-cover] storage upload failed");
    return NextResponse.json({ error: "No fue posible subir la carátula" }, { status: 502 });
  }

  try {
    const updated = await db
      .update(drops)
      .set({ banner: uploadedCover.publicUrl })
      .where(eq(drops.slug, existingDrop.slug))
      .returning({ slug: drops.slug });

    if (!updated[0]) {
      throw new Error("Drop update did not return a row");
    }
  } catch {
    try {
      await deleteDropCover(uploadedCover.storageKey);
    } catch {
      console.error("[drop-cover] uploaded cover compensation failed");
    }

    console.error("[drop-cover] database update failed");
    return NextResponse.json({ error: "No fue posible guardar la carátula" }, { status: 500 });
  }

  let warning: "OLD_COVER_CLEANUP_FAILED" | undefined;
  const oldStorageKey = getManagedDropCoverStorageKey(existingDrop.banner, existingDrop.slug);
  if (oldStorageKey && oldStorageKey !== uploadedCover.storageKey) {
    try {
      await deleteDropCover(oldStorageKey);
    } catch {
      warning = "OLD_COVER_CLEANUP_FAILED";
      console.error("[drop-cover] previous cover cleanup failed");
    }
  }

  const drop = await getDropBySlug(existingDrop.slug);
  if (!drop) {
    return NextResponse.json({ error: "No fue posible confirmar la carátula" }, { status: 500 });
  }

  return NextResponse.json({ drop, warning });
}
