import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryEnv } from "@/lib/env";

let isConfigured = false;

function ensureConfigured(): void {
  if (isConfigured) return;
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  isConfigured = true;
}

/** Reusable server-only Cloudinary client. Validates env on first use. */
export function getCloudinaryClient() {
  ensureConfigured();
  return cloudinary;
}

export interface CloudinaryPingResult {
  ok: true;
}

/**
 * Lightweight configuration check using the official ping API.
 * Throws a sanitized error; never includes secrets.
 */
export async function pingCloudinary(): Promise<CloudinaryPingResult> {
  const client = getCloudinaryClient();
  await client.api.ping();
  return { ok: true };
}

/** For tests/diagnostics only: reset config cache (e.g. after env change). */
export function __resetCloudinaryForTests(): void {
  isConfigured = false;
}
