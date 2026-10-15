import type { NextRequest } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-session";
import { isCloudinaryConfigured } from "@/lib/env";
import {
  uploadImageToFolder,
  validateImageFormFile,
} from "@/lib/uploads";
import { UNIVERSITY_IMAGE_FOLDER } from "@/lib/universities/validation";

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

  const validation = await validateImageFormFile(form.get("file"));
  if (!validation.ok) {
    return Response.json({ status: "error", message: validation.message }, { status: 400 });
  }

  try {
    const uploaded = await uploadImageToFolder(validation.file, UNIVERSITY_IMAGE_FOLDER);
    return Response.json(
      { status: "ok", data: { url: uploaded.url, publicId: uploaded.publicId } },
      { status: 201 }
    );
  } catch {
    console.error("[uploads/university-image] upload failed");
    return Response.json(
      { status: "error", message: "Image upload failed. Try again." },
      { status: 502 }
    );
  }
}
