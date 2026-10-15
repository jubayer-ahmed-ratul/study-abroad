/**
 * Country input validation and normalization. Pure functions, safe to import
 * from client components (slug suggestion) and server routes alike.
 * Database writes always go through the explicit allowlists below — raw
 * request bodies and MongoDB operators (`$...`) are never passed through.
 */

export const COUNTRY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const COUNTRY_IMAGE_FOLDER = "study-abroad/countries";

export const COUNTRY_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  slugMin: 2,
  slugMax: 120,
  shortDescriptionMax: 300,
  descriptionMax: 20000,
  metaTitleMax: 70,
  metaDescriptionMax: 160,
  imageUrlMax: 2048,
  publicIdMax: 300,
} as const;

export const COUNTRY_WRITABLE_FIELDS = [
  "name",
  "slug",
  "flagImageUrl",
  "flagImagePublicId",
  "shortDescription",
  "description",
  "isPublished",
  "metaTitle",
  "metaDescription",
] as const;

export type CountryWritableField = (typeof COUNTRY_WRITABLE_FIELDS)[number];

export interface ValidatedCountryInput {
  name?: string;
  slug?: string;
  flagImageUrl?: string;
  flagImagePublicId?: string;
  shortDescription?: string;
  description?: string;
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CountryValidation {
  ok: boolean;
  data: ValidatedCountryInput;
  errors: string[];
}

/** Lowercase, trim, collapse whitespace/underscores to single hyphens. */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Suggest an editable slug from a country name (client-side helper). */
export function suggestSlug(name: string): string {
  return normalizeSlug(name).slice(0, COUNTRY_LIMITS.slugMax);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
  errors: string[],
  empty: "omit" | "clear"
): string | undefined {
  if (value === undefined || value === null) return undefined;
  // In updates, an explicit empty string clears the field; on create it is omitted.
  if (value === "") return empty === "clear" ? "" : undefined;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors.push(`${field} must be at most ${max} characters.`);
    return undefined;
  }
  return trimmed.length > 0 ? trimmed : undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate a create (partial=false) or update (partial=true) payload.
 * Unknown keys and `$`-prefixed keys are rejected, never forwarded.
 */
export function validateCountryInput(input: unknown, partial: boolean): CountryValidation {
  const errors: string[] = [];
  const data: ValidatedCountryInput = {};

  if (!isRecord(input)) {
    return { ok: false, data, errors: ["Request body must be a JSON object."] };
  }

  for (const key of Object.keys(input)) {
    if (key.startsWith("$") || key.includes(".")) {
      errors.push(`Field "${key}" is not allowed.`);
    } else if (!(COUNTRY_WRITABLE_FIELDS as readonly string[]).includes(key)) {
      errors.push(`Unknown field "${key}".`);
    }
  }
  if (errors.length > 0) return { ok: false, data, errors };

  const get = (field: CountryWritableField): unknown => input[field];

  // Name
  const rawName = get("name");
  if (rawName === undefined || rawName === null || rawName === "") {
    if (!partial) errors.push("Name is required.");
  } else if (typeof rawName !== "string") {
    errors.push("Name must be a string.");
  } else {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (name.length < COUNTRY_LIMITS.nameMin) errors.push("Name must be at least 2 characters.");
    else if (name.length > COUNTRY_LIMITS.nameMax) errors.push("Name must be at most 120 characters.");
    else data.name = name;
  }

  // Slug
  const rawSlug = get("slug");
  if (rawSlug === undefined || rawSlug === null || rawSlug === "") {
    if (!partial) {
      if (data.name) {
        const suggested = suggestSlug(data.name);
        if (!COUNTRY_SLUG_PATTERN.test(suggested) || suggested.length < COUNTRY_LIMITS.slugMin) {
          errors.push("Slug could not be derived from the name; provide one explicitly.");
        } else {
          data.slug = suggested;
        }
      } else if (errors.length === 0) {
        errors.push("Slug is required.");
      }
    }
  } else if (typeof rawSlug !== "string") {
    errors.push("Slug must be a string.");
  } else {
    const slug = normalizeSlug(rawSlug).slice(0, COUNTRY_LIMITS.slugMax);
    if (slug.length < COUNTRY_LIMITS.slugMin) errors.push("Slug must be at least 2 characters.");
    else if (!COUNTRY_SLUG_PATTERN.test(slug))
      errors.push("Slug may contain lowercase letters, numbers, and hyphens only.");
    else data.slug = slug;
  }

  // Descriptions / SEO
  const emptyMode = partial ? "clear" : "omit";
  const shortDescription = optionalText(get("shortDescription"), "Short description", COUNTRY_LIMITS.shortDescriptionMax, errors, emptyMode);
  if (shortDescription !== undefined) data.shortDescription = shortDescription;
  const description = optionalText(get("description"), "Description", COUNTRY_LIMITS.descriptionMax, errors, emptyMode);
  if (description !== undefined) data.description = description;
  const metaTitle = optionalText(get("metaTitle"), "Meta title", COUNTRY_LIMITS.metaTitleMax, errors, emptyMode);
  if (metaTitle !== undefined) data.metaTitle = metaTitle;
  const metaDescription = optionalText(get("metaDescription"), "Meta description", COUNTRY_LIMITS.metaDescriptionMax, errors, emptyMode);
  if (metaDescription !== undefined) data.metaDescription = metaDescription;

  // Published flag
  const rawPublished = get("isPublished");
  if (rawPublished !== undefined) {
    if (typeof rawPublished !== "boolean") errors.push("isPublished must be a boolean.");
    else data.isPublished = rawPublished;
  } else if (!partial) {
    data.isPublished = false;
  }

  // Image reference (set via the secure upload endpoint; never a raw client URL trust chain —
  // the upload API mints these values server-side).
  const rawUrl = get("flagImageUrl");
  if (rawUrl !== undefined && rawUrl !== null) {
    if (rawUrl === "") {
      if (partial) data.flagImageUrl = "";
    } else if (typeof rawUrl !== "string" || rawUrl.length > COUNTRY_LIMITS.imageUrlMax || !isHttpsUrl(rawUrl)) {
      errors.push("flagImageUrl must be a valid https URL.");
    } else {
      data.flagImageUrl = rawUrl;
    }
  }
  const rawPublicId = get("flagImagePublicId");
  if (rawPublicId !== undefined && rawPublicId !== null) {
    if (rawPublicId === "") {
      if (partial) data.flagImagePublicId = "";
    } else if (
      typeof rawPublicId !== "string" ||
      rawPublicId.length > COUNTRY_LIMITS.publicIdMax ||
      !rawPublicId.startsWith(`${COUNTRY_IMAGE_FOLDER}/`) ||
      !/^[a-zA-Z0-9/_-]+$/.test(rawPublicId)
    ) {
      errors.push(`flagImagePublicId must live under ${COUNTRY_IMAGE_FOLDER}/.`);
    } else {
      data.flagImagePublicId = rawPublicId;
    }
  }

  if (partial && Object.keys(data).length === 0 && errors.length === 0) {
    errors.push("Provide at least one field to update.");
  }

  return { ok: errors.length === 0, data, errors };
}
