import "server-only";

import { createClient } from "@supabase/supabase-js";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_CONFECTION_IMAGE_BYTES = 10 * 1024 * 1024;

type AllowedConfectionImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filenameExtensions: readonly string[];
};

const ALLOWED_CONFECTION_IMAGES: readonly AllowedConfectionImage[] = [
  { contentType: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"] },
  { contentType: "image/png", extension: "png", filenameExtensions: ["png"] },
  { contentType: "image/webp", extension: "webp", filenameExtensions: ["webp"] },
];

type ConfectionImageUploadMetadata = { filename: string; contentType: string; size: number };

export type SignedConfectionImageUpload = { storagePath: string; token: string; publicUrl: string };

export class ConfectionImageUploadValidationError extends Error {}

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

function parseMetadata(value: unknown): ConfectionImageUploadMetadata {
  if (!isRecord(value)) throw new ConfectionImageUploadValidationError("Invalid confection image metadata");
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
    size > MAX_CONFECTION_IMAGE_BYTES
  ) {
    throw new ConfectionImageUploadValidationError("Invalid confection image metadata");
  }
  return { filename, contentType, size };
}

function getImageType(metadata: ConfectionImageUploadMetadata): AllowedConfectionImage {
  const extension = metadata.filename.split(".").pop()?.toLowerCase();
  const imageType = ALLOWED_CONFECTION_IMAGES.find((candidate) => candidate.contentType === metadata.contentType);
  if (!imageType || !extension || !imageType.filenameExtensions.includes(extension)) {
    throw new ConfectionImageUploadValidationError("Invalid confection image type");
  }
  return imageType;
}

export async function createSignedConfectionImageUpload(input: unknown): Promise<SignedConfectionImageUpload> {
  const metadata = parseMetadata(input);
  const imageType = getImageType(metadata);
  const storagePath = `confection/${crypto.randomUUID()}.${imageType.extension}`;
  const client = getAdminStorageClient();
  const { data: signedUpload, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !signedUpload) throw new Error("Unable to create signed confection image upload");
  const { data: publicUrl } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return { storagePath, token: signedUpload.token, publicUrl: publicUrl.publicUrl };
}

/** Deletes only exact, validated Confección object keys after their DB rows were removed. */
export async function removeConfectionImageObjects(storagePaths: string[]): Promise<void> {
  const exactPaths = storagePaths.filter(
    (storagePath) =>
      storagePath.startsWith("confection/") &&
      storagePath.length > "confection/".length &&
      !storagePath.includes("..") &&
      !storagePath.includes("\\"),
  );
  if (exactPaths.length === 0) return;
  const { error } = await getAdminStorageClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(exactPaths);
  if (error) throw new Error("Unable to remove confection image objects");
}
