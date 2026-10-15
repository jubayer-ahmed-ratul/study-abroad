import { getCurrentAdmin } from "@/lib/admin-session";
import { CountryApiError } from "@/lib/countries/service";

/**
 * Shared wrapper for admin country endpoints: server-side auth first,
 * typed service errors mapped to JSON statuses, unexpected failures
 * sanitized to 500 with no internals leaked.
 */
export async function handleAdminCountryRequest<T>(
  fn: () => Promise<T>,
  successStatus = 200
): Promise<Response> {
  try {
    const { status, admin } = await getCurrentAdmin();
    if (status !== "ok" || !admin) {
      const code = status === "forbidden" ? 403 : 401;
      return Response.json(
        { status: "error", message: code === 401 ? "Unauthorized." : "Forbidden." },
        { status: code }
      );
    }
    const data = await fn();
    return Response.json({ status: "ok", data }, { status: successStatus });
  } catch (error) {
    if (error instanceof CountryApiError) {
      return Response.json(
        {
          status: "error",
          message: error.message,
          ...(error.details ? { errors: error.details } : {}),
        },
        { status: error.status }
      );
    }
    console.error("[admin/countries] unexpected error");
    return Response.json({ status: "error", message: "Internal server error." }, { status: 500 });
  }
}
