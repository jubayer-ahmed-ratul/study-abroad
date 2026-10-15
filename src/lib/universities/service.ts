import "server-only";

import mongoose from "mongoose";
import { cacheLife, cacheTag, revalidatePath, revalidateTag } from "next/cache";

import { connectToDatabase } from "@/lib/mongodb";
import { Country, toSafeCountry, type SafeCountry } from "@/models/Country";
import {
  University,
  toSafeUniversity,
  type SafeUniversity,
  type UniversityRecordLike,
} from "@/models/University";
import { deleteImageInFolder } from "@/lib/uploads";
import { UNIVERSITIES_LIST_TAG, universityDetailTag } from "@/lib/universities/tags";
import { universityCountryTag } from "@/lib/universities/tags";
import type { ValidatedUniversityInput } from "@/lib/universities/validation";
import { UNIVERSITY_IMAGE_FOLDER } from "@/lib/universities/validation";

export class UniversityApiError extends Error {
  readonly status: number;
  readonly details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface UniversityListParams {
  q?: string;
  country?: string;
  status?: "all" | "published" | "draft";
  page?: number;
  limit?: number;
}

export interface UniversityListResult {
  items: SafeUniversity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CountryOption {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
}

const ADMIN_LIST_FIELDS = [
  "name",
  "slug",
  "country",
  "isPublished",
  "city",
  "updatedAt",
  "createdAt",
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

export function requireUniversityObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new UniversityApiError(400, "Invalid university id.");
  }
}

function revalidateUniversityCaches(slugs: string[], countrySlugs: string[]): void {
  revalidatePath("/universities");
  // { expire: 0 }: never serve stale — next request revalidates synchronously.
  revalidateTag(UNIVERSITIES_LIST_TAG, { expire: 0 });
  const countryTags = new Set(countrySlugs);
  for (const slug of slugs) {
    revalidatePath(`/universities/${slug}`);
    revalidateTag(universityDetailTag(slug), { expire: 0 });
  }
  for (const countrySlug of countryTags) {
    revalidatePath(`/countries/${countrySlug}/universities`);
    revalidateTag(universityCountryTag(countrySlug), { expire: 0 });
  }
}

async function assertCountryExists(countryId: string): Promise<{ slug: string }> {
  if (!mongoose.isValidObjectId(countryId)) {
    throw new UniversityApiError(400, "Country must be a valid country id.");
  }
  await connectToDatabase();
  const country = await Country.findById(countryId).select("slug").lean().exec();
  if (!country) {
    throw new UniversityApiError(400, "The selected country does not exist.");
  }
  return { slug: country.slug };
}

/** All countries for the admin selector (names, never raw ids alone). */
export async function listCountriesForSelect(): Promise<CountryOption[]> {
  await connectToDatabase();
  const docs = await Country.find({})
    .select("name slug isPublished")
    .sort({ name: 1 })
    .lean()
    .exec();
  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    isPublished: doc.isPublished,
  }));
}

export async function listUniversities(
  params: UniversityListParams
): Promise<UniversityListResult> {
  await connectToDatabase();

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 10)));
  const filter: Record<string, unknown> = {};

  if (params.status === "published") filter.isPublished = true;
  else if (params.status === "draft") filter.isPublished = false;

  if (params.country) {
    if (!mongoose.isValidObjectId(params.country)) {
      throw new UniversityApiError(400, "Invalid country filter.");
    }
    filter.country = new mongoose.Types.ObjectId(params.country);
  }

  const q = params.q?.trim();
  if (q) {
    filter.name = { $regex: escapeRegExp(q.slice(0, 160)), $options: "i" };
  }

  const [total, docs] = await Promise.all([
    University.countDocuments(filter).exec(),
    University.find(filter)
      .select(ADMIN_LIST_FIELDS)
      .populate("country", "name slug isPublished")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
  ]);

  return {
    items: docs.map((doc) => toSafeUniversity(doc as unknown as UniversityRecordLike)),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getUniversityById(id: string): Promise<SafeUniversity> {
  requireUniversityObjectId(id);
  await connectToDatabase();
  const doc = await University.findById(id).populate("country", "name slug isPublished").exec();
  if (!doc) throw new UniversityApiError(404, "University not found.");
  return toSafeUniversity(doc as unknown as UniversityRecordLike);
}

export async function createUniversity(
  input: ValidatedUniversityInput
): Promise<SafeUniversity> {
  const country = await assertCountryExists(input.country as string);
  try {
    const doc = await University.create({
      name: input.name,
      slug: input.slug,
      country: new mongoose.Types.ObjectId(input.country),
      logoUrl: input.logoUrl,
      logoPublicId: input.logoPublicId,
      coverImageUrl: input.coverImageUrl,
      coverImagePublicId: input.coverImagePublicId,
      shortDescription: input.shortDescription,
      description: input.description,
      website: input.website,
      city: input.city,
      address: input.address,
      establishedYear: input.establishedYear,
      programs: input.programs ?? [],
      degreeLevels: input.degreeLevels ?? [],
      isPublished: input.isPublished ?? false,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });
    revalidateUniversityCaches(doc.isPublished ? [doc.slug] : [], [country.slug]);
    const populated = await University.findById(doc._id)
      .populate("country", "name slug isPublished")
      .exec();
    if (!populated) throw new UniversityApiError(500, "Internal server error.");
    return toSafeUniversity(populated as unknown as UniversityRecordLike);
  } catch (error) {
    if (error instanceof UniversityApiError) throw error;
    if (isDuplicateKey(error)) {
      throw new UniversityApiError(409, "A university with this slug already exists.");
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new UniversityApiError(400, "Invalid university data.", [error.message]);
    }
    throw error;
  }
}

export async function updateUniversity(
  id: string,
  input: ValidatedUniversityInput
): Promise<SafeUniversity> {
  requireUniversityObjectId(id);
  await connectToDatabase();
  const doc = await University.findById(id).exec();
  if (!doc) throw new UniversityApiError(404, "University not found.");

  const oldSlug = doc.slug;
  const oldCountryId = String(doc.country);
  const oldPublicIds = [doc.logoPublicId, doc.coverImagePublicId].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  let countrySlug: string | null = null;
  if (input.country !== undefined) {
    const country = await assertCountryExists(input.country);
    doc.country = new mongoose.Types.ObjectId(input.country);
    countrySlug = country.slug;
  }

  if (input.name !== undefined) doc.name = input.name;
  if (input.slug !== undefined) doc.slug = input.slug;
  if (input.shortDescription !== undefined) doc.shortDescription = input.shortDescription;
  if (input.description !== undefined) doc.description = input.description;
  if (input.website !== undefined) doc.website = input.website;
  if (input.city !== undefined) doc.city = input.city;
  if (input.address !== undefined) doc.address = input.address;
  if (input.establishedYear !== undefined) doc.establishedYear = input.establishedYear;
  if (input.programs !== undefined) doc.programs = input.programs;
  if (input.degreeLevels !== undefined) doc.degreeLevels = input.degreeLevels;
  if (input.isPublished !== undefined) doc.isPublished = input.isPublished;
  if (input.metaTitle !== undefined) doc.metaTitle = input.metaTitle;
  if (input.metaDescription !== undefined) doc.metaDescription = input.metaDescription;
  if (input.logoUrl !== undefined) doc.logoUrl = input.logoUrl;
  if (input.logoPublicId !== undefined) doc.logoPublicId = input.logoPublicId;
  if (input.coverImageUrl !== undefined) doc.coverImageUrl = input.coverImageUrl;
  if (input.coverImagePublicId !== undefined) doc.coverImagePublicId = input.coverImagePublicId;

  try {
    await doc.save();
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new UniversityApiError(409, "A university with this slug already exists.");
    }
    if (error instanceof mongoose.Error.ValidationError) {
      throw new UniversityApiError(400, "Invalid university data.", [error.message]);
    }
    throw error;
  }

  // Replace-then-delete for both images, best-effort cleanup.
  const newPublicIds = new Set(
    [doc.logoPublicId, doc.coverImagePublicId].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )
  );
  for (const publicId of oldPublicIds) {
    if (!newPublicIds.has(publicId)) {
      try {
        await deleteImageInFolder(publicId, UNIVERSITY_IMAGE_FOLDER);
      } catch {
        console.error("[universities] old image cleanup failed");
      }
    }
  }

  const populated = await University.findById(doc._id)
    .populate("country", "name slug isPublished")
    .exec();
  if (!populated) throw new UniversityApiError(404, "University not found.");

  const slugs = doc.slug !== oldSlug ? [oldSlug, doc.slug] : [doc.slug];
  const countrySlugs = [String((populated.country as unknown as { slug?: string })?.slug ?? "")].filter(
    (slug) => slug.length > 0
  );
  if (countrySlug && !countrySlugs.includes(countrySlug)) countrySlugs.push(countrySlug);
  const oldCountry = await Country.findById(oldCountryId).select("slug").lean().exec();
  if (oldCountry && !countrySlugs.includes(oldCountry.slug)) countrySlugs.push(oldCountry.slug);
  revalidateUniversityCaches(slugs, countrySlugs);

  return toSafeUniversity(populated as unknown as UniversityRecordLike);
}

export async function deleteUniversity(id: string): Promise<{ slug: string }> {
  requireUniversityObjectId(id);
  await connectToDatabase();
  const doc = await University.findById(id).exec();
  if (!doc) throw new UniversityApiError(404, "University not found.");

  const slug = doc.slug;
  const publicIds = [doc.logoPublicId, doc.coverImagePublicId].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const countryDoc = await Country.findById(doc.country).select("slug").lean().exec();

  // Never delete the associated country — only this university.
  await doc.deleteOne();

  for (const publicId of publicIds) {
    try {
      await deleteImageInFolder(publicId, UNIVERSITY_IMAGE_FOLDER);
    } catch {
      console.error("[universities] image cleanup after delete failed");
    }
  }

  revalidateUniversityCaches([slug], countryDoc ? [countryDoc.slug] : []);
  return { slug };
}

// ---------------------------------------------------------------------------
// Public reads (published university AND published country, enforced in DB)
// ---------------------------------------------------------------------------

const PUBLIC_PROJECT = {
  name: 1,
  slug: 1,
  shortDescription: 1,
  description: 1,
  website: 1,
  city: 1,
  address: 1,
  establishedYear: 1,
  programs: 1,
  degreeLevels: 1,
  metaTitle: 1,
  metaDescription: 1,
  logoUrl: 1,
  coverImageUrl: 1,
  createdAt: 1,
  updatedAt: 1,
  country: { id: "$_country._id", name: "$_country.name", slug: "$_country.slug" },
} as const;

interface PublicListParams {
  q?: string;
  countrySlug?: string;
  page?: number;
  limit?: number;
}

function publicMatch(q?: string, countrySlug?: string): Record<string, unknown> {
  const match: Record<string, unknown> = {
    isPublished: true,
    "_country.isPublished": true,
  };
  if (countrySlug) match["_country.slug"] = countrySlug;
  if (q?.trim()) {
    match.name = { $regex: escapeRegExp(q.trim().slice(0, 160)), $options: "i" };
  }
  return match;
}

export async function listPublishedUniversities(
  params: PublicListParams
): Promise<UniversityListResult> {
  await connectToDatabase();

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 12)));

  const pipeline: mongoose.PipelineStage[] = [
    { $match: { isPublished: true } },
    {
      $lookup: {
        from: "countries",
        localField: "country",
        foreignField: "_id",
        as: "_country",
      },
    },
    { $unwind: "$_country" },
    { $match: publicMatch(params.q, params.countrySlug) },
    { $sort: { updatedAt: -1 } },
    {
      $facet: {
        total: [{ $count: "n" }],
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: PUBLIC_PROJECT },
        ],
      },
    },
  ];

  const [result] = await University.aggregate(pipeline).exec();
  const total: number = result?.total?.[0]?.n ?? 0;
  const items: SafeUniversity[] = (result?.items ?? []).map((doc: unknown) =>
    toSafeUniversity({
      ...(doc as Record<string, unknown>),
      _id: (doc as { _id: unknown })._id,
      createdAt: (doc as { createdAt: Date }).createdAt,
      updatedAt: (doc as { updatedAt: Date }).updatedAt,
    } as unknown as UniversityRecordLike)
  );

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Published-only detail with the country gate. Null when ineligible. */
export async function getPublishedUniversityBySlug(
  slug: string
): Promise<SafeUniversity | null> {
  await connectToDatabase();
  const doc = await University.findOne({ slug, isPublished: true })
    .populate("country", "name slug isPublished")
    .exec();
  if (!doc) return null;
  const safe = toSafeUniversity(doc as unknown as UniversityRecordLike);
  if (!safe.country.slug) return null;
  const country = await Country.findById(safe.country.id).select("isPublished").lean().exec();
  if (!country?.isPublished) return null;
  return safe;
}

export async function listPublishedUniversitySlugs(): Promise<string[]> {
  await connectToDatabase();
  const docs = await University.find({ isPublished: true }).select("slug").lean().exec();
  return docs.map((doc) => doc.slug);
}

/** Up to `limit` other published universities in the same published country. */
export async function listRelatedUniversities(
  universityId: string,
  countryId: string,
  limit = 3
): Promise<SafeUniversity[]> {  await connectToDatabase();
  const country = await Country.findById(countryId).select("isPublished").lean().exec();
  if (!country?.isPublished) return [];
  const docs = await University.find({
    country: new mongoose.Types.ObjectId(countryId),
    isPublished: true,
    _id: { $ne: new mongoose.Types.ObjectId(universityId) },
  })
    .select("name slug city shortDescription logoUrl createdAt updatedAt")
    .populate("country", "name slug isPublished")
    .sort({ updatedAt: -1 })
    .limit(Math.min(6, Math.max(1, limit)))
    .lean()
    .exec();
  return docs.map((doc) => toSafeUniversity(doc as unknown as UniversityRecordLike));
}

export async function listRelatedUniversitiesCached(
  universityId: string,
  countryId: string,
  limit = 3
): Promise<SafeUniversity[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(UNIVERSITIES_LIST_TAG);
  return listRelatedUniversities(universityId, countryId, limit);
}

export interface CountryUniversitiesResult {
  country: SafeCountry;
  universities: SafeUniversity[];
  total: number;
}

/** Published country with its published universities, or null when ineligible. */
export async function getCountryWithUniversities(
  countrySlug: string
): Promise<CountryUniversitiesResult | null> {
  await connectToDatabase();
  const countryDoc = await Country.findOne({ slug: countrySlug, isPublished: true }).exec();
  if (!countryDoc) return null;
  const country = toSafeCountry(countryDoc);
  const docs = await University.find({ country: countryDoc._id, isPublished: true })
    .select("name slug city shortDescription logoUrl createdAt updatedAt")
    .populate("country", "name slug isPublished")
    .sort({ name: 1 })
    .lean()
    .exec();
  const total = await University.countDocuments({
    country: countryDoc._id,
    isPublished: true,
  }).exec();
  return {
    country,
    universities: docs.map((doc) => toSafeUniversity(doc as unknown as UniversityRecordLike)),
    total,
  };
}

export async function getCountryWithUniversitiesCached(
  countrySlug: string
): Promise<CountryUniversitiesResult | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(UNIVERSITIES_LIST_TAG);
  return getCountryWithUniversities(countrySlug);
}

// Cached public wrappers (tags shared so country mutations purge correctly).
export async function listPublishedUniversitiesCached(
  params: PublicListParams
): Promise<UniversityListResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(UNIVERSITIES_LIST_TAG);
  return listPublishedUniversities(params);
}

export async function getPublishedUniversityBySlugCached(
  slug: string
): Promise<SafeUniversity | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(UNIVERSITIES_LIST_TAG, universityDetailTag(slug));
  return getPublishedUniversityBySlug(slug);
}

/**
 * Purge every university cache entry belonging to a country. Called by the
 * country service on publish-state changes, slug changes, and deletion, so
 * university details/lists track the country's visibility immediately.
 */
export async function revalidateUniversitiesForCountry(
  countryId: string
): Promise<void> {
  await connectToDatabase();
  const docs = await University.find({
    country: new mongoose.Types.ObjectId(countryId),
  })
    .select("slug")
    .lean()
    .exec();
  revalidateTag(UNIVERSITIES_LIST_TAG, { expire: 0 });
  revalidatePath("/universities");
  for (const doc of docs) {
    revalidateTag(universityDetailTag(doc.slug), { expire: 0 });
    revalidatePath(`/universities/${doc.slug}`);
  }
}
