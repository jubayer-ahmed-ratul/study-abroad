import type { NextRequest } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-session";
import { getCloudinaryClient } from "@/lib/cloudinary";
import { isCloudinaryConfigured } from "@/lib/env";
import { COUNTRY_IMAGE_FOLDER } from "@/lib/countries/validation";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function hasImageMagicBytes(bytes: Uint8Array, mime: string): boolean {
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

export async function POST(request: NextRequest) {
  // Auth first: never reveal service configuration to anonymous callers.
  const { status, admin } = await getCurrentAdmin();
  if (status !== "ok" || !admin) {
    const code = status === "forbidden" ? 403 : 401;
    return Response.json(
      { status: "error", message: code === 401 ? "Unauthorized." : "Forbidden." },
      { status: code }
    );
  }

  if (!isCloudinaryConfigured()) {
    return Response.json(
      {
        status: "error",
        message: "Image uploads are unavailable: Cloudinary is not configured.",
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { status: "error", message: "Request must be multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json(
      { status: "error", message: "Provide an image file as the 'file' field." },
      { status: 400 }
    );
  }
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return Response.json(
      { status: "error", message: "Only JPEG, PNG, and WebP images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { status: "error", message: "Image must be at most 2 MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasImageMagicBytes(new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(12, buffer.length)), file.type)) {
    return Response.json(
      { status: "error", message: "File content does not match its image type." },
      { status: 400 }
    );
  }

  try {
    const client = getCloudinaryClient();
    const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = client.uploader.upload_stream(
          { folder: COUNTRY_IMAGE_FOLDER, resource_type: "image" },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed."));
            else resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        );
        stream.end(buffer);
      }
    );
    return Response.json(
      { status: "ok", data: { url: uploaded.secure_url, publicId: uploaded.public_id } },
      { status: 201 }
    );
  } catch {
    console.error("[uploads/country-image] upload failed");
    return Response.json(
      { status: "error", message: "Image upload failed. Try again." },
      { status: 502 }
    );
  }
}
