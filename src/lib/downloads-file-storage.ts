import "server-only";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "digital-files";
const MAX_BYTES = 1024 * 1024 * 1024;
const SIGNED_DOWNLOAD_SECONDS = 120;

export class DownloadsFileUploadValidationError extends Error {}

function client() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new Error("Supabase storage is not configured"); return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }); }
function uploadMetadata(value: unknown) { if (typeof value !== "object" || value === null) throw new DownloadsFileUploadValidationError(); const input = value as Record<string, unknown>; if (typeof input.filename !== "string" || !input.filename.trim() || input.filename.length > 300 || input.filename.includes("/") || input.filename.includes("\\") || typeof input.size !== "number" || !Number.isInteger(input.size) || input.size <= 0 || input.size > MAX_BYTES || (input.contentType !== null && input.contentType !== undefined && typeof input.contentType !== "string")) throw new DownloadsFileUploadValidationError(); return { filename: input.filename.trim(), contentType: typeof input.contentType === "string" ? input.contentType : null, size: input.size }; }
function validPath(path: string) { return path.startsWith("downloads/") && path.length > 10 && !path.includes("..") && !path.includes("\\"); }

export async function createSignedDigitalFileUpload(input: unknown) { const file = uploadMetadata(input); const extension = file.filename.includes(".") ? `.${file.filename.split(".").pop()!.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}` : ""; const storagePath = `downloads/${crypto.randomUUID()}${extension}`; const storage = client(); const { data, error } = await storage.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false }); if (error || !data) throw new Error("Unable to authorize digital file upload"); return { storagePath, token: data.token, originalName: file.filename, mimeType: file.contentType, sizeBytes: file.size }; }
export async function removeDigitalFileObjects(paths: string[]) { const exact = paths.filter(validPath); if (!exact.length) return; const { error } = await client().storage.from(BUCKET).remove(exact); if (error) throw new Error("Unable to remove private file objects"); }
export async function createAuthorizedDigitalDownload(storagePath: string, filename: string) { if (!validPath(storagePath)) throw new Error("Invalid private file path"); const { data, error } = await client().storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_DOWNLOAD_SECONDS, { download: filename }); if (error || !data?.signedUrl) throw new Error("Unable to authorize download"); return { url: data.signedUrl, expiresIn: SIGNED_DOWNLOAD_SECONDS, filename }; }
export { SIGNED_DOWNLOAD_SECONDS };
