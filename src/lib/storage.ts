import { supabase } from "./supabase";

const PRODUCT_IMAGES_BUCKET = "product-images";

export type UploadedProductImage = {
  storageKey: string;
  publicUrl: string;
  originalFilename: string;
};

type SignedProductImageUploadAuthorization = UploadedProductImage & {
  token: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Se conserva el mensaje de respaldo cuando la respuesta no tiene JSON.
  }

  return fallback;
}

function toSignedProductImageUploadAuthorization(
  value: unknown,
): SignedProductImageUploadAuthorization | null {
  if (
    !isRecord(value) ||
    typeof value.storageKey !== "string" ||
    typeof value.token !== "string" ||
    typeof value.publicUrl !== "string" ||
    typeof value.originalFilename !== "string"
  ) {
    return null;
  }

  return {
    storageKey: value.storageKey,
    token: value.token,
    publicUrl: value.publicUrl,
    originalFilename: value.originalFilename,
  };
}

async function requestSignedProductImageUpload(
  file: File,
): Promise<SignedProductImageUploadAuthorization> {
  const response = await fetch("/api/admin/products/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!response.ok) {
    throw new Error(await responseError(response, "No fue posible autorizar la subida de imagen"));
  }

  const authorization = toSignedProductImageUploadAuthorization(await response.json());
  if (!authorization) {
    throw new Error("La autorización de subida de imagen no es válida");
  }

  return authorization;
}

export function getProductImagePublicUrl(storageKey: string): string {
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storageKey);

  return data.publicUrl;
}

export async function uploadProductImage(file: File): Promise<UploadedProductImage> {
  const authorization = await requestSignedProductImageUpload(file);
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .uploadToSignedUrl(authorization.storageKey, authorization.token, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "31536000",
    });

  if (error) {
    throw error;
  }

  return {
    storageKey: authorization.storageKey,
    publicUrl: authorization.publicUrl,
    originalFilename: authorization.originalFilename,
  };
}

export async function uploadProductImages(files: FileList): Promise<UploadedProductImage[]> {
  const uploadedImages: UploadedProductImage[] = [];

  for (const file of Array.from(files)) {
    uploadedImages.push(await uploadProductImage(file));
  }

  return uploadedImages;
}

export async function uploadImage(file: File): Promise<string> {
  const uploadedImage = await uploadProductImage(file);

  return uploadedImage.publicUrl;
}

export async function uploadImages(files: FileList): Promise<string[]> {
  const uploadedImages = await uploadProductImages(files);

  return uploadedImages.map((image) => image.publicUrl);
}
