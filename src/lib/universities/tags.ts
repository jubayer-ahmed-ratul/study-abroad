/**
 * Cache-tag constants for university reads. Leaf module (no imports) so both
 * the university service and the country service can use them without
 * import cycles.
 *
 * Tag scheme:
 * - `universities-list` — every public university listing, including
 *   per-country sub-lists (over-purges slightly at this scale, always correct).
 * - `university-<slug>` — one university detail page.
 * - `country-<slug>` (shared with the country service) — every university
 *   detail also carries its country's tag, so unpublishing/deleting a country
 *   instantly hides its universities' detail pages too.
 */
export const UNIVERSITIES_LIST_TAG = "universities-list";

export function universityDetailTag(slug: string): string {
  return `university-${slug}`;
}

export function universityCountryTag(countrySlug: string): string {
  return `country-${countrySlug}`;
}
