import { getCurrentAdmin } from "@/lib/admin-session";

/**
 * Example protected admin API. Page navigations redirect to login;
 * API callers receive JSON with proper 401/403 statuses (never redirects).
 */
export async function GET() {
  const { status, admin } = await getCurrentAdmin();

  if (status === "unauthenticated") {
    return Response.json(
      { status: "error", message: "Unauthorized." },
      { status: 401 }
    );
  }
  if (status === "forbidden" || !admin) {
    return Response.json(
      { status: "error", message: "Forbidden." },
      { status: 403 }
    );
  }

  // SafeAdmin only — passwordHash is never selected or serialized.
  return Response.json({ status: "ok", admin }, { status: 200 });
}
