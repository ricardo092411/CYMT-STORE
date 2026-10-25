import "server-only";

import { createClient } from "@supabase/supabase-js";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_MACHINERY_IMAGE_BYTES = 10 * 1024 * 1024;

type AllowedMachineryImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filenameExtensions: readonly string[];
};

const ALLOWED_MACHINERY_IMAGES: readonly AllowedMachineryImage[] = [
  { contentType: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"] },
  { contentType: "image/png", extension: "png", filenameExtensions: ["png"] },
  { contentType: "image/webp", extension: "webp", filenameExtensions: ["webp"] },
];

type MachineryImageUploadMetadata = { filename: string; contentType: string; size: number };

export type SignedMachineryImageUpload = {
  storagePath: string;
  token: string;
  publicUrl: string;
};

export class MachineryImageUploadValidationError extends Error {}

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

function parseMetadata(value: unknown): MachineryImageUploadMetadata {
  if (!isRecord(value)) throw new MachineryImageUploadValidationError("Invalid machinery image metadata");
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
    size > MAX_MACHINERY_IMAGE_BYTES
  ) {
    throw new MachineryImageUploadValidationError("Invalid machinery image metadata");
  }
  return { filename, contentType, size };
}

function getImageType(metadata: MachineryImageUploadMetadata): AllowedMachineryImage {
  const extension = metadata.filename.split(".").pop()?.toLowerCase();
  const imageType = ALLOWED_MACHINERY_IMAGES.find((candidate) => candidate.contentType === metadata.contentType);
  if (!imageType || !extension || !imageType.filenameExtensions.includes(extension)) {
    throw new MachineryImageUploadValidationError("Invalid machinery image type");
  }
  return imageType;
}

export async function createSignedMachineryImageUpload(input: unknown): Promise<SignedMachineryImageUpload> {
  const metadata = parseMetadata(input);
  const imageType = getImageType(metadata);
  const storagePath = `machinery/${crypto.randomUUID()}.${imageType.extension}`;
  const client = getAdminStorageClient();
  const { data: signedUpload, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !signedUpload) throw new Error("Unable to create signed machinery image upload");
  const { data: publicUrl } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return { storagePath, token: signedUpload.token, publicUrl: publicUrl.publicUrl };
}

/** Deletes only exact, validated machinery keys after their DB rows were removed. */
export async function removeMachineryImageObjects(storagePaths: string[]): Promise<void> {
  const exactPaths = storagePaths.filter(
    (storagePath) =>
      storagePath.startsWith("machinery/") &&
      storagePath.length > "machinery/".length &&
      !storagePath.includes("..") &&
      !storagePath.includes("\\"),
  );
  if (exactPaths.length === 0) return;
  const { error } = await getAdminStorageClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(exactPaths);
  if (error) throw new Error("Unable to remove machinery image objects");
}
