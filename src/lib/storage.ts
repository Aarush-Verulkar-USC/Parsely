import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./storage";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const SUPPORTED_MIME_TYPES = Object.keys(EXT_BY_MIME);

export function isSupportedMime(mime: string): boolean {
  return mime in EXT_BY_MIME;
}

export async function storeOriginal(
  invoiceId: string,
  mimeType: string,
  bytes: Buffer,
): Promise<string> {
  const ext = EXT_BY_MIME[mimeType] ?? "bin";
  const dir = path.join(STORAGE_DIR, invoiceId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `original.${ext}`);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function readOriginal(storagePath: string): Promise<Buffer> {
  return readFile(storagePath);
}
