import type { NextRequest } from "next/server";

import { handleAdminUniversityRequest } from "@/lib/universities/api-helpers";
import {
  UniversityApiError,
  deleteUniversity,
  getUniversityById,
  updateUniversity,
} from "@/lib/universities/service";
import { validateUniversityInput } from "@/lib/universities/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return handleAdminUniversityRequest(() => getUniversityById(id));
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

  const validation = validateUniversityInput(body, true);
  if (!validation.ok) {
    return handleAdminUniversityRequest(() => {
      throw new UniversityApiError(400, "Invalid university data.", validation.errors);
    });
  }

  return handleAdminUniversityRequest(() => updateUniversity(id, validation.data));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return handleAdminUniversityRequest(() => deleteUniversity(id));
}
