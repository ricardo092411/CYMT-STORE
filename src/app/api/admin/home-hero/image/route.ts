import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import {
  getHomeHeroRead,
  HomeHeroTableUnavailableError,
  updateHomeHeroImage,
} from "@/lib/home-hero";
import {
  createHomeHeroStorageKey,
  deleteHomeHeroImage,
  getManagedHomeHeroStorageKey,
  uploadHomeHeroImage,
} from "@/lib/home-hero-storage";

export const runtime = "nodejs";

const MAX_HOME_HERO_IMAGE_BYTES = 8 * 1024 * 1024;

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
  const separatorIndex = filename.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex === filename.length - 1) return null;
  return filename.slice(separatorIndex + 1).toLowerCase() || null;
}

function startsWithBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((byte, index) => bytes[index] === byte);
}

function detectImageSignature(bytes: Uint8Array): ImageSignature | null {
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return IMAGE_SIGNATURES[0];
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return IMAGE_SIGNATURES[1];
  }
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWithBytes(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return IMAGE_SIGNATURES[2];
  }
  return null;
}

async function validateImageFile(file: File): Promise<ImageSignature | null> {
  if (file.size <= 0 || file.size > MAX_HOME_HERO_IMAGE_BYTES) return null;

  const signature = detectImageSignature(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!signature) return null;

  const extension = filenameExtension(file.name);
  if (!extension || !signature.filenameExtensions.includes(extension) || file.type !== signature.mime) {
    return null;
  }

  return signature;
}

function getImageFile(formData: FormData): File | null {
  const entries = Array.from(formData.entries());
  if (entries.length !== 1 || entries[0]?.[0] !== "file") return null;

  const value = entries[0][1];
  return value instanceof File ? value : null;
}

function schemaUnavailableResponse() {
  return NextResponse.json(
    { error: "La configuración del Hero aún no está disponible. Aplica el SQL de bootstrap." },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario de imagen inválido" }, { status: 400 });
  }

  const file = getImageFile(formData);
  if (!file) {
    return NextResponse.json({ error: "Selecciona una imagen para el Hero" }, { status: 400 });
  }

  const signature = await validateImageFile(file);
  if (!signature) {
    return NextResponse.json(
      { error: "La imagen debe ser JPEG, PNG o WebP válido de hasta 8 MB" },
      { status: 400 },
    );
  }

  let currentHero;
  try {
    currentHero = await getHomeHeroRead();
  } catch {
    console.error("[home-hero-image] current Hero read failed");
    return NextResponse.json({ error: "No fue posible preparar la imagen del Hero" }, { status: 500 });
  }

  if (currentHero.source === "table-unavailable") return schemaUnavailableResponse();

  const storageKey = createHomeHeroStorageKey(signature.extension);
  let uploadedImage;
  try {
    uploadedImage = await uploadHomeHeroImage({ storageKey, file });
  } catch {
    console.error("[home-hero-image] storage upload failed");
    return NextResponse.json({ error: "No fue posible subir la imagen del Hero" }, { status: 502 });
  }

  try {
    await updateHomeHeroImage(uploadedImage.publicUrl);
  } catch (error) {
    try {
      await deleteHomeHeroImage(uploadedImage.storageKey);
    } catch {
      console.error("[home-hero-image] uploaded image compensation failed");
    }

    if (error instanceof HomeHeroTableUnavailableError) return schemaUnavailableResponse();
    console.error("[home-hero-image] database update failed");
    return NextResponse.json({ error: "No fue posible guardar la imagen del Hero" }, { status: 500 });
  }

  let confirmed;
  try {
    confirmed = await getHomeHeroRead();
  } catch {
    console.error("[home-hero-image] confirmation read failed");
    return NextResponse.json({ error: "La imagen se guardó, pero no pudo confirmarse" }, { status: 500 });
  }

  if (confirmed.source !== "database" || confirmed.hero.imageUrl !== uploadedImage.publicUrl) {
    console.error("[home-hero-image] confirmation mismatch");
    return NextResponse.json({ error: "La imagen se guardó, pero no pudo confirmarse" }, { status: 500 });
  }

  let warning: "OLD_HERO_IMAGE_CLEANUP_FAILED" | undefined;
  const oldStorageKey = getManagedHomeHeroStorageKey(currentHero.hero.imageUrl);
  if (oldStorageKey && oldStorageKey !== uploadedImage.storageKey) {
    try {
      await deleteHomeHeroImage(oldStorageKey);
    } catch {
      warning = "OLD_HERO_IMAGE_CLEANUP_FAILED";
      console.error("[home-hero-image] previous image cleanup failed");
    }
  }

  revalidatePath("/");
  return NextResponse.json({ hero: confirmed.hero, warning });
}
