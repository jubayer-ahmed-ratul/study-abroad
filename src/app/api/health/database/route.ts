import type { NextRequest } from "next/server";

import { pingDatabase } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import type { HealthError, HealthSuccess } from "@/types/health";

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `health:database:${ip}`;
}

function sanitizeMongoError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  // Our own validation messages name only variable names (no values) — safe to return.
  if (/^MONGODB_(URI|DB) is not set/.test(message) || /MONGODB_URI looks invalid/.test(message)) {
    return message;
  }
  // Never leak URI, credentials, or stack traces from driver errors.
  if (/mongodb(\+srv)?:\/\//i.test(message)) {
    console.error("[health/database] ping failed (connection string redacted)");
    return "Database unreachable.";
  }
  if (/MONGODB_URI|MONGODB_DB/i.test(message)) {
    return "Database is misconfigured. Check server environment variables.";
  }
  console.error("[health/database] ping failed");
  return "Database unreachable.";
}

export async function GET(request: NextRequest) {
  const { allowed, retryAfterSeconds } = checkRateLimit(clientKey(request), 10, 60_000);
  if (!allowed) {
    return Response.json(
      {
        status: "error",
        service: "database",
        message: "Too many requests. Try again shortly.",
      } satisfies HealthError,
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  try {
    await pingDatabase();
    return Response.json(
      {
        status: "ok",
        service: "database",
        message: "Database reachable.",
      } satisfies HealthSuccess,
      { status: 200 }
    );
  } catch (error) {
    const message = sanitizeMongoError(error);
    const misconfigured = /misconfigured|not set|looks invalid/i.test(message);
    return Response.json(
      {
        status: misconfigured ? "misconfigured" : "error",
        service: "database",
        message,
      } satisfies HealthError,
      { status: misconfigured ? 503 : 503 }
    );
  }
}
