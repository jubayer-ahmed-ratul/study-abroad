import "server-only";

/**
 * Dependency checks for safe country deletion.
 *
 * Phase 2: universities do not exist yet, so this always reports zero.
 * Phase 3 must replace the stub with a real count against the University
 * model (e.g. `University.countDocuments({ country: countryId })`).
 * Deletion already refuses non-zero counts with HTTP 409 — no caller changes
 * needed when the real check lands.
 */
export interface CountryDependencies {
  universities: number;
}

export async function checkCountryDependencies(
  _countryId: string
): Promise<CountryDependencies> {
  void _countryId;
  // TODO(phase-3): return { universities: await University.countDocuments({ country: countryId }) }
  return { universities: 0 };
}
