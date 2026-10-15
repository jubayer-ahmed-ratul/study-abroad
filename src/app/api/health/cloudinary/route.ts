import type { NextRequest } from "next/server";

import { pingCloudinary } from "@/lib/cloudinary";
import { checkRateLimit } from "@/lib/rate-limit";
import type { HealthError, HealthSuccess } from "@/types/health";

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `health:cloudinary:${ip}`;
}

function sanitizeCloudinaryError(error: unknown): { message: string; status: number } {
  const message = error instanceof Error ? error.message : "Unknown error";
  const lower = message.toLowerCase();

  if (/missing cloudinary configuration|not set/i.test(message)) {
    return { message, status: 503 };
  }
  // Invalid credentials: report clearly without leaking secrets.
  if (
    lower.includes("invalid api key") ||
    lower.includes("invalid_signature") ||
    lower.includes("unknown api key") ||
    lower.includes("401") ||
    lower.includes("unauthorized")
  ) {
    console.error("[health/cloudinary] invalid credentials");
    return { message: "Cloudinary credentials are invalid.", status: 503 };
  }
  // Permission-scoped keys may lack admin ping rights.
  if (lower.includes("forbidden") || lower.includes("403") || lower.includes("not allowed")) {
    console.error("[health/cloudinary] insufficient API permissions for ping");
    return {
      message:
        "Cloudinary account API is not permitted with this key. Credentials may be valid but lack ping permission.",
      status: 503,
    };
  }

  console.error("[health/cloudinary] ping failed");
  return { message: "Cloudinary unreachable.", status: 503 };
}

export async function GET(request: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(clientKey(request), 10, 60_000);
  if (!allowed) {
    return Response.json(
      {
        status: "error",
        service: "cloudinary",
        message: "Too many requests. Try again shortly.",
      } satisfies HealthError,
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  try {
    await pingCloudinary();
    return Response.json(
      {
        status: "ok",
        service: "cloudinary",
        message: "Cloudinary configuration valid.",
      } satisfies HealthSuccess,
      { status: 200 }
    );
  } catch (error) {
    const { message, status } = sanitizeCloudinaryError(error);
    const misconfigured = status === 503 && /missing|not permitted|invalid/i.test(message);
    return Response.json(
      {
        status: misconfigured ? "misconfigured" : "error",
        service: "cloudinary",
        message,
      } satisfies HealthError,
      { status }
    );
  }
}
