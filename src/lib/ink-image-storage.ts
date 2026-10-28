import "server-only";

import { createClient } from "@supabase/supabase-js";

const PRODUCT_IMAGES_BUCKET = "product-images";
const STORAGE_PREFIX = "cmt-ink/";
const MAX_INK_IMAGE_BYTES = 10 * 1024 * 1024;

type AllowedInkImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filenameExtensions: readonly string[];
};

const ALLOWED_INK_IMAGES: readonly AllowedInkImage[] = [
  { contentType: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"] },
  { contentType: "image/png", extension: "png", filenameExtensions: ["png"] },
  { contentType: "image/webp", extension: "webp", filenameExtensions: ["webp"] },
];

type InkImageUploadMetadata = { filename: string; contentType: string; size: number };

export type SignedInkImageUpload = { storagePath: string; token: string; publicUrl: string };

export class InkImageUploadValidationError extends Error {}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Supabase URL is not configured");
  return url;
}

function getAdminStorageClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Supabase administrative storage is not configured");
  return createClient(getSupabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMetadata(value: unknown): InkImageUploadMetadata {
  if (!isRecord(value)) throw new InkImageUploadValidationError("Invalid ink image metadata");
  const { filename, contentType, size } = value;
  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.trim() !== filename ||
    filename.length > 255 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\u0000-\u001f]/.test(filename) ||
    typeof contentType !== "string" ||
    typeof size !== "number" ||
    !Number.isInteger(size) ||
    size <= 0 ||
    size > MAX_INK_IMAGE_BYTES
  ) {
    throw new InkImageUploadValidationError("Invalid ink image metadata");
  }
  return { filename, contentType, size };
}

function getImageType(metadata: InkImageUploadMetadata): AllowedInkImage {
  const extension = metadata.filename.split(".").pop()?.toLowerCase();
  const imageType = ALLOWED_INK_IMAGES.find((candidate) => candidate.contentType === metadata.contentType);
  if (!imageType || !extension || !imageType.filenameExtensions.includes(extension)) {
    throw new InkImageUploadValidationError("Invalid ink image type");
  }
  return imageType;
}

export async function createSignedInkImageUpload(input: unknown): Promise<SignedInkImageUpload> {
  const metadata = parseMetadata(input);
  const imageType = getImageType(metadata);
  const storagePath = `${STORAGE_PREFIX}${crypto.randomUUID()}.${imageType.extension}`;
  const client = getAdminStorageClient();
  const { data: signedUpload, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !signedUpload) throw new Error("Unable to create signed CMT Ink image upload");
  const { data: publicUrl } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return { storagePath, token: signedUpload.token, publicUrl: publicUrl.publicUrl };
}

/** Deletes only exact, validated CMT Ink keys after their DB rows were removed. */
export async function removeInkImageObjects(storagePaths: string[]): Promise<void> {
  const exactPaths = storagePaths.filter(
    (storagePath) => storagePath.startsWith(STORAGE_PREFIX) && storagePath.length > STORAGE_PREFIX.length && !storagePath.includes("..") && !storagePath.includes("\\"),
  );
  if (exactPaths.length === 0) return;
  const { error } = await getAdminStorageClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(exactPaths);
  if (error) throw new Error("Unable to remove CMT Ink image objects");
}
