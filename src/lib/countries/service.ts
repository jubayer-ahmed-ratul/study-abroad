import "server-only";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { connectToDatabase } from "@/lib/mongodb";
import { Country, toSafeCountry, type CountryRecord, type SafeCountry } from "@/models/Country";
import { checkCountryDependencies } from "@/lib/countries/dependencies";
import { deleteCountryImage } from "@/lib/countries/images";
import type { ValidatedCountryInput } from "@/lib/countries/validation";

export class CountryApiError extends Error {
  readonly status: number;
  readonly details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface CountryListParams {
  q?: string;
  status?: "all" | "published" | "draft";
  page?: number;
  limit?: number;
}

export interface CountryListResult {
  items: SafeCountry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIST_FIELDS = [
  "name",
  "slug",
  "isPublished",
  "shortDescription",
  "flagImageUrl",
  "createdAt",
  "updatedAt",
].join(" ");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export function requireObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new CountryApiError(400, "Invalid country id.");
  }
}

export async function listCountries(params: CountryListParams): Promise<CountryListResult> {
  await connectToDatabase();

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 10)));
  const filter: Record<string, unknown> = {};

  if (params.status === "published") filter.isPublished = true;
  else if (params.status === "draft") filter.isPublished = false;

  const q = params.q?.trim();
  if (q) {
    filter.name = { $regex: escapeRegExp(q.slice(0, 120)), $options: "i" };
  }

  const [total, docs] = await Promise.all([
    Country.countDocuments(filter).exec(),
    Country.find(filter)
      .select(LIST_FIELDS)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
  ]);

  return {
    items: docs.map((doc) => toSafeCountry(doc as unknown as CountryRecord)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getCountryById(id: string): Promise<SafeCountry> {
  requireObjectId(id);
  await connectToDatabase();
  const doc = await Country.findById(id).exec();
  if (!doc) throw new CountryApiError(404, "Country not found.");
  return toSafeCountry(doc);
}

/** Published-only lookup for public pages. Returns null instead of throwing. */
export async function getPublishedCountryBySlug(slug: string): Promise<SafeCountry | null> {
  await connectToDatabase();
  const doc = await Country.findOne({ slug, isPublished: true }).exec();
  return doc ? toSafeCountry(doc) : null;
}

export async function listPublishedCountries(): Promise<SafeCountry[]> {
  await connectToDatabase();
  const docs = await Country.find({ isPublished: true })
    .select("name slug shortDescription flagImageUrl createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean()
    .exec();
  return docs.map((doc) => toSafeCountry(doc as unknown as CountryRecord));
}

export async function createCountry(input: ValidatedCountryInput): Promise<SafeCountry> {
  await connectToDatabase();
  try {
    const doc = await Country.create({
      name: input.name,
      slug: input.slug,
      flagImageUrl: input.flagImageUrl,
      flagImagePublicId: input.flagImagePublicId,
      shortDescription: input.shortDescription,
      description: input.description,
      isPublished: input.isPublished ?? false,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });
    revalidatePath("/countries");
    if (doc.isPublished) revalidatePath(`/countries/${doc.slug}`);
    return toSafeCountry(doc);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new CountryApiError(409, "A country with this slug already exists.");
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new CountryApiError(400, "Invalid country data.", [error.message]);
    }
    throw error;
  }
}

export async function updateCountry(
  id: string,
  input: ValidatedCountryInput
): Promise<SafeCountry> {
  requireObjectId(id);
  await connectToDatabase();
  const doc = await Country.findById(id).exec();
  if (!doc) throw new CountryApiError(404, "Country not found.");

  const oldSlug = doc.slug;
  const oldPublicId = doc.flagImagePublicId;

  if (input.name !== undefined) doc.name = input.name;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.shortDescription !== undefined) doc.shortDescription = input.shortDescription;
  if (input.description !== undefined) doc.description = input.description;
  if (input.isPublished !== undefined) doc.isPublished = input.isPublished;
  if (input.metaTitle !== undefined) doc.metaTitle = input.metaTitle;
  if (input.metaDescription !== undefined) doc.metaDescription = input.metaDescription;
  if (input.flagImageUrl !== undefined) doc.flagImageUrl = input.flagImageUrl;
  if (input.flagImagePublicId !== undefined) doc.flagImagePublicId = input.flagImagePublicId;

  try {
    await doc.save();
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new CountryApiError(409, "A country with this slug already exists.");
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new CountryApiError(400, "Invalid country data.", [error.message]);
    }
    throw error;
  }

  // Replace-then-delete: the new image is already persisted; remove the old
  // one best-effort. A failed cleanup is logged, never fatal — the public ID
  // remains visible on Cloudinary but unreferenced (see README limits).
  const newPublicId = doc.flagImagePublicId;
  if (oldPublicId && oldPublicId !== newPublicId) {
    try {
      await deleteCountryImage(oldPublicId);
    } catch {
      console.error("[countries] old image cleanup failed");
    }
  }

  revalidatePath("/countries");
  revalidatePath(`/countries/${oldSlug}`);
  if (doc.slug !== oldSlug) revalidatePath(`/countries/${doc.slug}`);

  return toSafeCountry(doc);
}

export async function deleteCountry(id: string): Promise<{ slug: string }> {
  requireObjectId(id);
  await connectToDatabase();
  const doc = await Country.findById(id).exec();
  if (!doc) throw new CountryApiError(404, "Country not found.");

  const deps = await checkCountryDependencies(id);
  if (deps.universities > 0) {
    throw new CountryApiError(
      409,
      `Cannot delete: ${deps.universities} universities reference this country. Unpublish instead.`
    );
  }

  const slug = doc.slug;
  const publicId = doc.flagImagePublicId;
  await doc.deleteOne();

  if (publicId) {
    try {
      await deleteCountryImage(publicId);
    } catch {
      console.error("[countries] image cleanup after delete failed");
    }
  }

  revalidatePath("/countries");
  revalidatePath(`/countries/${slug}`);
  return { slug };
}
