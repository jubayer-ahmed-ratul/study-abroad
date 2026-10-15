import type { NextRequest } from "next/server";

import { handleAdminCountryRequest } from "@/lib/countries/api-helpers";
import { createCountry, listCountries } from "@/lib/countries/service";
import { CountryApiError } from "@/lib/countries/service";
import { validateCountryInput } from "@/lib/countries/validation";

const STATUSES = ["all", "published", "draft"] as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? "all";
  if (!(STATUSES as readonly string[]).includes(statusParam)) {
    return Response.json(
      { status: "error", message: "Invalid status filter. Use all, published, or draft." },
      { status: 400 }
    );
  }
  return handleAdminCountryRequest(() =>
    listCountries({
      q: params.get("q") ?? undefined,
      status: statusParam as (typeof STATUSES)[number],
      page: Number(params.get("page") ?? 1),
      limit: Number(params.get("limit") ?? 10),
    })
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validation = validateCountryInput(body, false);
  if (!validation.ok) {
    // Auth still required: run through the wrapper so anon callers get 401,
    // not validation details.
    return handleAdminCountryRequest(() => {
      throw new CountryApiError(400, "Invalid country data.", validation.errors);
    });
  }

  return handleAdminCountryRequest(() => createCountry(validation.data), 201);
}
