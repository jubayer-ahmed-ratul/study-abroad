/**
 * University input validation and normalization. Pure functions, safe to
 * import from client components and server routes alike.
 *
 * Writes always go through the explicit allowlist — raw request bodies and
 * MongoDB operators (`$...`) are never passed to Mongoose. The `country`
 * field accepts only an ObjectId string; existence is verified server-side
 * against the Country collection (never trust populated objects from clients).
 */

import { normalizeSlug, suggestSlug } from "@/lib/countries/validation";

export const UNIVERSITY_IMAGE_FOLDER = "study-abroad/universities";

export const UNIVERSITY_LIMITS = {
  nameMin: 2,
  nameMax: 160,
  slugMin: 2,
  slugMax: 160,
  shortDescriptionMax: 300,
  descriptionMax: 20000,
  metaTitleMax: 70,
  metaDescriptionMax: 160,
  urlMax: 2048,
  publicIdMax: 300,
  cityMax: 120,
  addressMax: 300,
  programsMax: 30,
  programItemMax: 80,
  degreeLevelsMax: 20,
  degreeLevelItemMax: 80,
} as const;

export const UNIVERSITY_WRITABLE_FIELDS = [
  "name",
  "slug",
  "country",
  "logoUrl",
  "logoPublicId",
  "coverImageUrl",
  "coverImagePublicId",
  "shortDescription",
  "description",
  "website",
  "city",
  "address",
  "establishedYear",
  "programs",
  "degreeLevels",
  "isPublished",
  "metaTitle",
  "metaDescription",
] as const;

export type UniversityWritableField = (typeof UNIVERSITY_WRITABLE_FIELDS)[number];

export interface ValidatedUniversityInput {
  name?: string;
  slug?: string;
  country?: string;
  logoUrl?: string;
  logoPublicId?: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  shortDescription?: string;
  description?: string;
  website?: string;
  city?: string;
  address?: string;
  establishedYear?: number;
  programs?: string[];
  degreeLevels?: string[];
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UniversityValidation {
  ok: boolean;
  data: ValidatedUniversityInput;
  errors: string[];
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
  return trimmed.length > 0 ? trimmed : empty === "clear" ? "" : undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function optionalImageRef(
  url: unknown,
  publicId: unknown,
  urlField: string,
  idField: string,
  errors: string[],
  empty: "omit" | "clear",
  data: ValidatedUniversityInput,
  urlKey: "logoUrl" | "coverImageUrl",
  idKey: "logoPublicId" | "coverImagePublicId"
): void {
  if (url !== undefined && url !== null) {
    if (url === "") {
      if (empty === "clear") data[urlKey] = "";
    } else if (
      typeof url !== "string" ||
      url.length > UNIVERSITY_LIMITS.urlMax ||
      !isHttpsUrl(url)
    ) {
      errors.push(`${urlField} must be a valid https URL.`);
    } else {
      data[urlKey] = url;
    }
  }
  if (publicId !== undefined && publicId !== null) {
    if (publicId === "") {
      if (empty === "clear") data[idKey] = "";
    } else if (
      typeof publicId !== "string" ||
      publicId.length > UNIVERSITY_LIMITS.publicIdMax ||
      !publicId.startsWith(`${UNIVERSITY_IMAGE_FOLDER}/`) ||
      !/^[a-zA-Z0-9/_-]+$/.test(publicId)
    ) {
      errors.push(`${idField} must live under ${UNIVERSITY_IMAGE_FOLDER}/.`);
    } else {
      data[idKey] = publicId;
    }
  }
}

function stringArray(
  value: unknown,
  field: string,
  maxItems: number,
  maxItem: number,
  errors: string[]
): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array of strings.`);
    return undefined;
  }
  if (value.length > maxItems) {
    errors.push(`${field} must have at most ${maxItems} entries.`);
    return undefined;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      errors.push(`${field} must contain only strings.`);
      return undefined;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > maxItem) {
      errors.push(`${field} entries must be at most ${maxItem} characters.`);
      return undefined;
    }
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

export function validateUniversityInput(
  input: unknown,
  partial: boolean
): UniversityValidation {
  const errors: string[] = [];
  const data: ValidatedUniversityInput = {};

  if (!isRecord(input)) {
    return { ok: false, data, errors: ["Request body must be a JSON object."] };
  }

  for (const key of Object.keys(input)) {
    if (key.startsWith("$") || key.includes(".")) {
      errors.push(`Field "${key}" is not allowed.`);
    } else if (!(UNIVERSITY_WRITABLE_FIELDS as readonly string[]).includes(key)) {
      errors.push(`Unknown field "${key}".`);
    }
  }
  if (errors.length > 0) return { ok: false, data, errors };

  const emptyMode = partial ? "clear" : "omit";
  const get = (field: UniversityWritableField): unknown => input[field];

  // Name
  const rawName = get("name");
  if (rawName === undefined || rawName === null || rawName === "") {
    if (!partial) errors.push("Name is required.");
  } else if (typeof rawName !== "string") {
    errors.push("Name must be a string.");
  } else {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (name.length < UNIVERSITY_LIMITS.nameMin) errors.push("Name must be at least 2 characters.");
    else if (name.length > UNIVERSITY_LIMITS.nameMax) errors.push("Name must be at most 160 characters.");
    else data.name = name;
  }

  // Slug (auto-suggest from name on create, always editable)
  const rawSlug = get("slug");
  if (rawSlug === undefined || rawSlug === null || rawSlug === "") {
    if (!partial) {
      if (data.name) {
        const suggested = suggestSlug(data.name).slice(0, UNIVERSITY_LIMITS.slugMax);
        if (suggested.length < UNIVERSITY_LIMITS.slugMin) {
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
    const slug = normalizeSlug(rawSlug).slice(0, UNIVERSITY_LIMITS.slugMax);
    if (slug.length < UNIVERSITY_LIMITS.slugMin) errors.push("Slug must be at least 2 characters.");
    else data.slug = slug;
  }

  // Country: ObjectId string only. Existence is verified server-side.
  const rawCountry = get("country");
  if (rawCountry === undefined || rawCountry === null || rawCountry === "") {
    if (!partial) errors.push("Country is required.");
  } else if (typeof rawCountry !== "string" || !/^[0-9a-fA-F]{24}$/.test(rawCountry)) {
    errors.push("Country must be a valid country id.");
  } else {
    data.country = rawCountry;
  }

  // Images (minted server-side by the upload endpoint)
  optionalImageRef(get("logoUrl"), get("logoPublicId"), "logoUrl", "logoPublicId", errors, emptyMode, data, "logoUrl", "logoPublicId");
  optionalImageRef(get("coverImageUrl"), get("coverImagePublicId"), "coverImageUrl", "coverImagePublicId", errors, emptyMode, data, "coverImageUrl", "coverImagePublicId");

  // Text fields
  const shortDescription = optionalText(get("shortDescription"), "Short description", UNIVERSITY_LIMITS.shortDescriptionMax, errors, emptyMode);
  if (shortDescription !== undefined) data.shortDescription = shortDescription;
  const description = optionalText(get("description"), "Description", UNIVERSITY_LIMITS.descriptionMax, errors, emptyMode);
  if (description !== undefined) data.description = description;
  const metaTitle = optionalText(get("metaTitle"), "Meta title", UNIVERSITY_LIMITS.metaTitleMax, errors, emptyMode);
  if (metaTitle !== undefined) data.metaTitle = metaTitle;
  const metaDescription = optionalText(get("metaDescription"), "Meta description", UNIVERSITY_LIMITS.metaDescriptionMax, errors, emptyMode);
  if (metaDescription !== undefined) data.metaDescription = metaDescription;
  const city = optionalText(get("city"), "City", UNIVERSITY_LIMITS.cityMax, errors, emptyMode);
  if (city !== undefined) data.city = city;
  const address = optionalText(get("address"), "Address", UNIVERSITY_LIMITS.addressMax, errors, emptyMode);
  if (address !== undefined) data.address = address;

  // Website
  const rawWebsite = get("website");
  if (rawWebsite !== undefined && rawWebsite !== null && rawWebsite !== "") {
    if (
      typeof rawWebsite !== "string" ||
      rawWebsite.length > UNIVERSITY_LIMITS.urlMax ||
      !isHttpsUrl(rawWebsite.trim())
    ) {
      errors.push("Website must be a valid https URL.");
    } else {
      data.website = rawWebsite.trim();
    }
  } else if (rawWebsite === "" && partial) {
    data.website = "";
  }

  // Established year
  const rawYear = get("establishedYear");
  if (rawYear !== undefined && rawYear !== null && rawYear !== "") {
    const currentYear = new Date().getFullYear();
    if (typeof rawYear !== "number" || !Number.isInteger(rawYear)) {
      errors.push("Established year must be a whole number.");
    } else if (rawYear < 1000 || rawYear > currentYear) {
      errors.push(`Established year must be between 1000 and ${currentYear}.`);
    } else {
      data.establishedYear = rawYear;
    }
  }

  // Arrays
  const programs = stringArray(get("programs"), "Programs", UNIVERSITY_LIMITS.programsMax, UNIVERSITY_LIMITS.programItemMax, errors);
  if (programs !== undefined) data.programs = programs;
  const degreeLevels = stringArray(get("degreeLevels"), "Degree levels", UNIVERSITY_LIMITS.degreeLevelsMax, UNIVERSITY_LIMITS.degreeLevelItemMax, errors);
  if (degreeLevels !== undefined) data.degreeLevels = degreeLevels;

  // Published flag
  const rawPublished = get("isPublished");
  if (rawPublished !== undefined) {
    if (typeof rawPublished !== "boolean") errors.push("isPublished must be a boolean.");
    else data.isPublished = rawPublished;
  } else if (!partial) {
    data.isPublished = false;
  }

  if (partial && Object.keys(data).length === 0 && errors.length === 0) {
    errors.push("Provide at least one field to update.");
  }

  return { ok: errors.length === 0, data, errors };
}
