import "server-only";
import { createClient } from "@supabase/supabase-js";

const DROP_COVER_BUCKET = "product-images";

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
    },
  });
}

export type UploadedDropCover = {
  storageKey: string;
  publicUrl: string;
};

export function createDropCoverStorageKey(slug: string, extension: string): string {
  return `drops/${slug}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadDropCover({
  storageKey,
  file,
}: {
  storageKey: string;
  file: File;
}): Promise<UploadedDropCover> {
  const client = getAdminStorageClient();
  const { error } = await client.storage
    .from(DROP_COVER_BUCKET)
    .upload(storageKey, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "31536000",
    });

  if (error) throw error;

  const { data } = client.storage.from(DROP_COVER_BUCKET).getPublicUrl(storageKey);
  return { storageKey, publicUrl: data.publicUrl };
}

export async function deleteDropCover(storageKey: string): Promise<void> {
  const client = getAdminStorageClient();
  const { error } = await client.storage.from(DROP_COVER_BUCKET).remove([storageKey]);
  if (error) throw error;
}

/** Returns a key only for covers created by this administrative flow. */
export function getManagedDropCoverStorageKey(
  banner: string | null,
  slug: string,
): string | null {
  if (!banner) return null;

  try {
    const bannerUrl = new URL(banner);
    const supabaseUrl = new URL(getSupabaseUrl());
    const publicObjectPrefix = `/storage/v1/object/public/${DROP_COVER_BUCKET}/`;

    if (bannerUrl.origin !== supabaseUrl.origin || !bannerUrl.pathname.startsWith(publicObjectPrefix)) {
      return null;
    }

    const storageKey = decodeURIComponent(bannerUrl.pathname.slice(publicObjectPrefix.length));
    return storageKey.startsWith(`drops/${slug}/`) ? storageKey : null;
  } catch {
    return null;
  }
}
