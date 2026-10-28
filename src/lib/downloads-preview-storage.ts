import "server-only";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = [
  { contentType: "image/jpeg", extension: "jpg", names: ["jpg", "jpeg"] },
  { contentType: "image/png", extension: "png", names: ["png"] },
  { contentType: "image/webp", extension: "webp", names: ["webp"] },
] as const;

export class DownloadsPreviewUploadValidationError extends Error {}

function client() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new Error("Supabase storage is not configured"); return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }); }
function metadata(value: unknown) { if (typeof value !== "object" || value === null) throw new DownloadsPreviewUploadValidationError(); const input = value as Record<string, unknown>; if (typeof input.filename !== "string" || !input.filename || input.filename.length > 255 || input.filename.includes("/") || input.filename.includes("\\") || typeof input.contentType !== "string" || typeof input.size !== "number" || !Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_BYTES) throw new DownloadsPreviewUploadValidationError(); return { filename: input.filename, contentType: input.contentType, size: input.size }; }

export async function createSignedDownloadsPreviewUpload(input: unknown) { const file = metadata(input); const extension = file.filename.split(".").pop()?.toLowerCase(); const type = TYPES.find((candidate) => candidate.contentType === file.contentType && extension && candidate.names.includes(extension as never)); if (!type) throw new DownloadsPreviewUploadValidationError(); const storagePath = `downloads/${crypto.randomUUID()}.${type.extension}`; const storage = client(); const { data, error } = await storage.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false }); if (error || !data) throw new Error("Unable to authorize preview upload"); const { data: url } = storage.storage.from(BUCKET).getPublicUrl(storagePath); return { storagePath, token: data.token, publicUrl: url.publicUrl }; }
export async function removeDownloadsPreviewObjects(paths: string[]) { const exact = paths.filter((path) => path.startsWith("downloads/") && path.length > 10 && !path.includes("..") && !path.includes("\\")); if (!exact.length) return; const { error } = await client().storage.from(BUCKET).remove(exact); if (error) throw new Error("Unable to remove preview objects"); }
