import "server-only";

import { createClient } from "@supabase/supabase-js";

const HOME_HERO_BUCKET = "product-images";
const HOME_HERO_PREFIX = "site/home-hero/";

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase URL is not configured");
  return supabaseUrl;
}

function getAdminStorageClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Supabase administrative storage is not configured");

  return createClient(getSupabaseUrl(), secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export type UploadedHomeHeroImage = {
  storageKey: string;
  publicUrl: string;
};

export function createHomeHeroStorageKey(extension: "jpg" | "png" | "webp"): string {
  return `${HOME_HERO_PREFIX}${crypto.randomUUID()}.${extension}`;
}

export async function uploadHomeHeroImage({
  storageKey,
  file,
}: {
  storageKey: string;
  file: File;
}): Promise<UploadedHomeHeroImage> {
  const client = getAdminStorageClient();
  const { error } = await client.storage
    .from(HOME_HERO_BUCKET)
    .upload(storageKey, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "31536000",
    });
  if (error) throw error;

  const { data } = client.storage.from(HOME_HERO_BUCKET).getPublicUrl(storageKey);
  return { storageKey, publicUrl: data.publicUrl };
}

export async function deleteHomeHeroImage(storageKey: string): Promise<void> {
  const client = getAdminStorageClient();
  const { error } = await client.storage.from(HOME_HERO_BUCKET).remove([storageKey]);
  if (error) throw error;
}

/** Returns a key only for images written by this dedicated Hero flow. */
export function getManagedHomeHeroStorageKey(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const supabaseUrl = new URL(getSupabaseUrl());
    const publicObjectPrefix = `/storage/v1/object/public/${HOME_HERO_BUCKET}/`;
    if (url.origin !== supabaseUrl.origin || !url.pathname.startsWith(publicObjectPrefix)) {
      return null;
    }

    const storageKey = decodeURIComponent(url.pathname.slice(publicObjectPrefix.length));
    return storageKey.startsWith(HOME_HERO_PREFIX) ? storageKey : null;
  } catch {
    return null;
  }
}
