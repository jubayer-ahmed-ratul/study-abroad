import type { NextRequest } from "next/server";

import { handleAdminCountryRequest } from "@/lib/countries/api-helpers";
import { CountryApiError, deleteCountry, getCountryById, updateCountry } from "@/lib/countries/service";
import { validateCountryInput } from "@/lib/countries/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return handleAdminCountryRequest(() => getCountryById(id));
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { status: "error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const validation = validateCountryInput(body, true);
  if (!validation.ok) {
    return handleAdminCountryRequest(() => {
      throw new CountryApiError(400, "Invalid country data.", validation.errors);
    });
  }

  return handleAdminCountryRequest(() => updateCountry(id, validation.data));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return handleAdminCountryRequest(() => deleteCountry(id));
}
