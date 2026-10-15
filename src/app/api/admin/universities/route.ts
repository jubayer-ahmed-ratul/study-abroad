import type { NextRequest } from "next/server";

import { handleAdminUniversityRequest } from "@/lib/universities/api-helpers";
import { createUniversity, listUniversities } from "@/lib/universities/service";
import { UniversityApiError } from "@/lib/universities/service";
import { validateUniversityInput } from "@/lib/universities/validation";

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
  return handleAdminUniversityRequest(() =>
    listUniversities({
      q: params.get("q") ?? undefined,
      country: params.get("country") ?? undefined,
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

  const validation = validateUniversityInput(body, false);
  if (!validation.ok) {
    // Auth still required: run through the wrapper so anon callers get 401,
    // not validation details.
    return handleAdminUniversityRequest(() => {
      throw new UniversityApiError(400, "Invalid university data.", validation.errors);
    });
  }

  return handleAdminUniversityRequest(() => createUniversity(validation.data), 201);
}
