import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { type: "image/avif", ext: "avif", test: (b) => b.subarray(4, 12).toString("ascii") === "ftypavif" },
];

export class UploadError extends Error {}

export interface StoredImage {
  url: string;
  key: string;
  contentType: string;
  width: number | null;
  height: number | null;
}

/**
 * Applies the camera orientation, strips all metadata (EXIF, GPS location of
 * the site) and caps the long edge, re-encoding in the original format.
 */
async function normalise(buffer: Buffer, type: string): Promise<{ data: Buffer; width: number | null; height: number | null }> {
  const { default: sharp } = await import("sharp");
  let pipeline = sharp(buffer, { failOn: "error" }).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true });
  if (type === "image/png") pipeline = pipeline.png({ compressionLevel: 9 });
  else if (type === "image/webp") pipeline = pipeline.webp({ quality: 85 });
  else if (type === "image/avif") pipeline = pipeline.avif({ quality: 60 });
  else pipeline = pipeline.jpeg({ quality: 86, mozjpeg: true });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, width: info.width ?? null, height: info.height ?? null };
}

/**
 * STORAGE_DRIVER:
 *   local    → files under UPLOAD_DIR (default .data/uploads), served from /media/*
 *   supabase → Supabase Storage bucket (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET)
 */
function driver(): "local" | "supabase" {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

export function uploadDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR ?? ".data/uploads");
}

/** Validates by file signature (not the client-supplied MIME type) and stores. */
export async function saveImage(file: File, folder = "projects"): Promise<StoredImage> {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 8 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((s) => s.test(buffer));
  if (!kind) throw new UploadError("Only JPEG, PNG, WebP or AVIF images are allowed.");

  let processed: Awaited<ReturnType<typeof normalise>>;
  try {
    processed = await normalise(buffer, kind.type);
  } catch (error) {
    logger.warn("storage.image_unreadable", { error });
    throw new UploadError("This image could not be read. Please try another file.");
  }
  const key = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}.${kind.ext}`;
  const dims = { width: processed.width, height: processed.height };

  if (driver() === "supabase") {
    const { url, bucket, serviceKey } = supabaseConfig();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": kind.type, "Cache-Control": "31536000", "x-upsert": "false" },
      body: new Uint8Array(processed.data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      logger.error("storage.upload_failed", { status: res.status, body: await res.text().catch(() => "") });
      throw new UploadError("Image upload failed. Please try again.");
    }
    return { key, url: `${url}/storage/v1/object/public/${bucket}/${key}`, contentType: kind.type, ...dims };
  }

  const target = path.join(/*turbopackIgnore: true*/ uploadDir(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, processed.data);
  return { key, url: `/media/${key}`, contentType: kind.type, ...dims };
}

export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    if (driver() === "supabase") {
      const { url, bucket, serviceKey } = supabaseConfig();
      await fetch(`${url}/storage/v1/object/${bucket}/${key}`, { method: "DELETE", headers: { Authorization: `Bearer ${serviceKey}` } });
    } else {
      await unlink(safeLocalPath(key));
    }
  } catch (error) {
    logger.warn("storage.delete_failed", { key, error });
  }
}

/** Resolve a key inside UPLOAD_DIR, refusing path traversal. */
export function safeLocalPath(key: string): string {
  const root = uploadDir();
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!resolved.startsWith(root + path.sep)) throw new UploadError("Invalid path");
  return resolved;
}

export async function readLocalImage(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    const data = await readFile(safeLocalPath(key));
    const kind = SIGNATURES.find((s) => s.test(data));
    return kind ? { data, contentType: kind.type } : null;
  } catch {
    return null;
  }
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "project-images";
  if (!url || !serviceKey) throw new UploadError("Supabase storage is not configured.");
  return { url, serviceKey, bucket };
}
