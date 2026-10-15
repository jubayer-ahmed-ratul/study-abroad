import "server-only";

import { University } from "@/models/University";

/**
 * Dependency checks for safe country deletion.
 *
 * Counts real university references: a country with universities cannot be
 * deleted (HTTP 409) — unpublish it instead. Universities are never
 * cascade-deleted.
 */
export interface CountryDependencies {
  universities: number;
}

export async function checkCountryDependencies(
  countryId: string
): Promise<CountryDependencies> {
  const universities = await University.countDocuments({ country: countryId }).exec();
  return { universities };
}
