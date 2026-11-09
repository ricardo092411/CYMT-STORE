import "server-only";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const LANDING_PREFIX = "cmt-ink/landing/";
const SHOWCASE_PREFIX = "cmt-ink/showcase/";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

type MediaType = "image" | "video";

type AllowedUpload = {
  mediaType: MediaType;
  contentType: string;
  extension: string;
  filenameExtensions: readonly string[];
  maxBytes: number;
};

const LANDING_IMAGE_TYPES: readonly AllowedUpload[] = [
  { mediaType: "image", contentType: "image/jpeg", extension: "jpg", filenameExtensions: ["jpg", "jpeg"], maxBytes: MAX_IMAGE_BYTES },
  { mediaType: "image", contentType: "image/png", extension: "png", filenameExtensions: ["png"], maxBytes: MAX_IMAGE_BYTES },
  { mediaType: "image", contentType: "image/webp", extension: "webp", filenameExtensions: ["webp"], maxBytes: MAX_IMAGE_BYTES },
];

const SHOWCASE_TYPES: readonly AllowedUpload[] = [
  ...LANDING_IMAGE_TYPES,
  { mediaType: "video", contentType: "video/mp4", extension: "mp4", filenameExtensions: ["mp4"], maxBytes: MAX_VIDEO_BYTES },
  { mediaType: "video", contentType: "video/webm", extension: "webm", filenameExtensions: ["webm"], maxBytes: MAX_VIDEO_BYTES },
];

type UploadMetadata = { filename: string; contentType: string; size: number };

export type SignedInkMediaUpload = {
  storagePath: string;
  token: string;
  publicUrl: string;
  mediaType: MediaType;
};

export class InkMediaUploadValidationError extends Error {}

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Supabase administrative storage is not configured");
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMetadata(value: unknown): UploadMetadata {
  if (!isRecord(value)) throw new InkMediaUploadValidationError("Invalid CMT Ink media metadata");
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
    size <= 0
  ) {
    throw new InkMediaUploadValidationError("Invalid CMT Ink media metadata");
  }
  return { filename, contentType, size };
}

function uploadType(metadata: UploadMetadata, allowed: readonly AllowedUpload[]): AllowedUpload {
  const extension = metadata.filename.split(".").pop()?.toLowerCase();
  const type = allowed.find(
    (candidate) =>
      candidate.contentType === metadata.contentType &&
      extension !== undefined &&
      candidate.filenameExtensions.includes(extension),
  );
  if (!type || metadata.size > type.maxBytes) {
    throw new InkMediaUploadValidationError("Invalid CMT Ink media type");
  }
  return type;
}

async function createSignedUpload(
  input: unknown,
  prefix: string,
  allowed: readonly AllowedUpload[],
): Promise<SignedInkMediaUpload> {
  const metadata = parseMetadata(input);
  const type = uploadType(metadata, allowed);
  const storagePath = `${prefix}${crypto.randomUUID()}.${type.extension}`;
  const client = storageClient();
  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !data) throw new Error("Unable to create signed CMT Ink media upload");
  const { data: publicUrl } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return { storagePath, token: data.token, publicUrl: publicUrl.publicUrl, mediaType: type.mediaType };
}

function safePath(path: string, prefix: string): boolean {
  return (
    path.startsWith(prefix) &&
    path.length > prefix.length &&
    !path.slice(prefix.length).includes("/") &&
    !path.includes("..") &&
    !path.includes("\\")
  );
}

async function removePaths(paths: string[], prefix: string): Promise<void> {
  const exactPaths = paths.filter((path) => safePath(path, prefix));
  if (exactPaths.length === 0) return;
  const { error } = await storageClient().storage.from(BUCKET).remove(exactPaths);
  if (error) throw new Error("Unable to remove CMT Ink media objects");
}

export function createSignedInkLandingUpload(input: unknown): Promise<SignedInkMediaUpload> {
  return createSignedUpload(input, LANDING_PREFIX, LANDING_IMAGE_TYPES);
}

export function createSignedInkShowcaseUpload(input: unknown): Promise<SignedInkMediaUpload> {
  return createSignedUpload(input, SHOWCASE_PREFIX, SHOWCASE_TYPES);
}

/** Removes only exact CMT Ink landing keys after a successful DB update. */
export function removeInkLandingObjects(paths: string[]): Promise<void> {
  return removePaths(paths, LANDING_PREFIX);
}

/** Removes only exact CMT Ink showcase keys after a successful DB update. */
export function removeInkShowcaseObjects(paths: string[]): Promise<void> {
  return removePaths(paths, SHOWCASE_PREFIX);
}
