import "server-only";

import { createClient } from "@supabase/supabase-js";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

type AllowedProductImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filenameExtensions: readonly string[];
};

const ALLOWED_PRODUCT_IMAGES: readonly AllowedProductImage[] = [
  { contentType: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"] },
  { contentType: "image/png", extension: "png", filenameExtensions: ["png"] },
  { contentType: "image/webp", extension: "webp", filenameExtensions: ["webp"] },
];

type ProductImageUploadMetadata = {
  filename: string;
  contentType: string;
  size: number;
};

export type SignedProductImageUpload = {
  storageKey: string;
  token: string;
  publicUrl: string;
  originalFilename: string;
};

export class ProductImageUploadValidationError extends Error {}

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }

  return supabaseUrl;
}

function getAdminStorageClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Supabase administrative storage is not configured");
  }

  return createClient(getSupabaseUrl(), secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function filenameExtension(filename: string): string | null {
  const separatorIndex = filename.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex === filename.length - 1) return null;

  const extension = filename.slice(separatorIndex + 1).toLowerCase();
  return extension || null;
}

function parseUploadMetadata(value: unknown): ProductImageUploadMetadata {
  if (!isRecord(value)) {
    throw new ProductImageUploadValidationError("Invalid product image metadata");
  }

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
    size > MAX_PRODUCT_IMAGE_BYTES
  ) {
    throw new ProductImageUploadValidationError("Invalid product image metadata");
  }

  return { filename, contentType, size };
}

function getAllowedProductImage(metadata: ProductImageUploadMetadata): AllowedProductImage {
  const imageType = ALLOWED_PRODUCT_IMAGES.find(
    (candidate) => candidate.contentType === metadata.contentType,
  );
  const extension = filenameExtension(metadata.filename);

  if (!imageType || !extension || !imageType.filenameExtensions.includes(extension)) {
    throw new ProductImageUploadValidationError("Invalid product image type");
  }

  return imageType;
}

export async function createSignedProductImageUpload(
  input: unknown,
): Promise<SignedProductImageUpload> {
  const metadata = parseUploadMetadata(input);
  const imageType = getAllowedProductImage(metadata);
  const storageKey = `products/${crypto.randomUUID()}.${imageType.extension}`;
  const client = getAdminStorageClient();

  const { data: signedUpload, error } = await client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(storageKey, { upsert: false });

  if (error || !signedUpload) {
    throw new Error("Unable to create signed product image upload");
  }

  const { data: publicUrlData } = client.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storageKey);

  return {
    storageKey,
    token: signedUpload.token,
    publicUrl: publicUrlData.publicUrl,
    originalFilename: metadata.filename,
  };
}
