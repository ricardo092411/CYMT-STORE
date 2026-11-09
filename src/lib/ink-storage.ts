import { supabase } from "@/lib/supabase";

const PRODUCT_IMAGES_BUCKET = "product-images";

export type UploadedInkImage = { storagePath: string; publicUrl: string };
export type UploadedInkShowcaseMedia = UploadedInkImage & { mediaType: "image" | "video" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // The safe fallback is returned below.
  }
  return fallback;
}

export function getInkImagePublicUrl(storagePath: string): string {
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function uploadInkImage(file: File): Promise<UploadedInkImage> {
  const authorizationResponse = await fetch("/api/admin/inks/products/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!authorizationResponse.ok) throw new Error(await responseError(authorizationResponse, "No fue posible autorizar la subida"));
  const authorization: unknown = await authorizationResponse.json();
  if (!isRecord(authorization) || typeof authorization.storagePath !== "string" || typeof authorization.token !== "string" || typeof authorization.publicUrl !== "string") {
    throw new Error("La autorización de imagen no es válida");
  }
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .uploadToSignedUrl(authorization.storagePath, authorization.token, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "31536000",
    });
  if (error) throw error;
  return { storagePath: authorization.storagePath, publicUrl: authorization.publicUrl };
}

async function uploadInkMedia(
  endpoint: string,
  file: File,
): Promise<UploadedInkShowcaseMedia> {
  const authorizationResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
  });
  if (!authorizationResponse.ok) {
    throw new Error(await responseError(authorizationResponse, "No fue posible autorizar la subida"));
  }
  const authorization: unknown = await authorizationResponse.json();
  if (
    !isRecord(authorization) ||
    typeof authorization.storagePath !== "string" ||
    typeof authorization.token !== "string" ||
    typeof authorization.publicUrl !== "string" ||
    (authorization.mediaType !== "image" && authorization.mediaType !== "video")
  ) {
    throw new Error("La autorización del archivo no es válida");
  }
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .uploadToSignedUrl(authorization.storagePath, authorization.token, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "31536000",
    });
  if (error) throw error;
  return {
    storagePath: authorization.storagePath,
    publicUrl: authorization.publicUrl,
    mediaType: authorization.mediaType,
  };
}

export function uploadInkLandingImage(file: File): Promise<UploadedInkShowcaseMedia> {
  return uploadInkMedia("/api/admin/inks/landing/upload", file);
}

export function uploadInkShowcaseMedia(file: File): Promise<UploadedInkShowcaseMedia> {
  return uploadInkMedia("/api/admin/inks/products/media/upload", file);
}
