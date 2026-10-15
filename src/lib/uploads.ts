import "server-only";

import { getCloudinaryClient } from "@/lib/cloudinary";

/**
 * Shared server-only image upload pipeline (universities use it; the country
 * upload route keeps its own identical copy untouched to avoid regressions).
 * Auth and Cloudinary-configured checks happen in the route handlers.
 */

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const UPLOAD_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ValidatedImageFile {
  buffer: Buffer;
  mime: string;
}

export function hasImageMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    );
  }
  // image/webp: RIFF....WEBP
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

export type ImageValidation =
  | { ok: true; file: ValidatedImageFile }
  | { ok: false; message: string };

export async function validateImageFormFile(value: unknown): Promise<ImageValidation> {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, message: "Provide an image file as the 'file' field." };
  }
  if (!(UPLOAD_ALLOWED_TYPES as readonly string[]).includes(value.type)) {
    return { ok: false, message: "Only JPEG, PNG, and WebP images are allowed." };
  }
  if (value.size > UPLOAD_MAX_BYTES) {
    return { ok: false, message: "Image must be at most 2 MB." };
  }
  const buffer = Buffer.from(await value.arrayBuffer());
  const head = new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(12, buffer.length));
  if (!hasImageMagicBytes(head, value.type)) {
    return { ok: false, message: "File content does not match its image type." };
  }
  return { ok: true, file: { buffer, mime: value.type } };
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

export async function uploadImageToFolder(
  file: ValidatedImageFile,
  folder: string
): Promise<UploadedImage> {
  void file.mime;
  const client = getCloudinaryClient();
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = client.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed."));
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(file.buffer);
    }
  );
  return { url: uploaded.secure_url, publicId: uploaded.public_id };
}

/**
 * Delete an asset only when its public ID lives under the expected folder.
 * Throws otherwise — callers decide whether a cleanup failure is fatal.
 */
export async function deleteImageInFolder(publicId: string, folder: string): Promise<void> {
  if (!publicId.startsWith(`${folder}/`)) {
    throw new Error("Refusing to delete an image outside the expected folder.");
  }
  const client = getCloudinaryClient();
  await client.uploader.destroy(publicId, { invalidate: true });
}
