import mongoose, { type Model, Schema } from "mongoose";

import { COUNTRY_SLUG_PATTERN } from "@/lib/countries/validation";

export interface UniversityAttrs {
  name: string;
  slug: string;
  country: mongoose.Types.ObjectId;
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
  programs: string[];
  degreeLevels: string[];
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UniversityDoc extends UniversityAttrs, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type UniversityModel = Model<UniversityDoc>;

const UniversitySchema = new Schema<UniversityDoc, UniversityModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [160, "Name must be at most 160 characters."],
    },
    slug: {
      type: String,
      required: [true, "Slug is required."],
      trim: true,
      lowercase: true,
      minlength: [2, "Slug must be at least 2 characters."],
      maxlength: [160, "Slug must be at most 160 characters."],
      match: [COUNTRY_SLUG_PATTERN, "Slug may contain lowercase letters, numbers, and hyphens only."],
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: [true, "Country is required."],
      index: true,
    },
    logoUrl: { type: String, trim: true, maxlength: [2048, "Logo URL is too long."] },
    logoPublicId: { type: String, trim: true, maxlength: [300, "Logo public ID is too long."] },
    coverImageUrl: { type: String, trim: true, maxlength: [2048, "Cover image URL is too long."] },
    coverImagePublicId: { type: String, trim: true, maxlength: [300, "Cover public ID is too long."] },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description must be at most 300 characters."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [20000, "Description must be at most 20000 characters."],
    },
    website: { type: String, trim: true, maxlength: [2048, "Website URL is too long."] },
    city: { type: String, trim: true, maxlength: [120, "City must be at most 120 characters."] },
    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address must be at most 300 characters."],
    },
    establishedYear: {
      type: Number,
      min: [1000, "Established year must be at least 1000."],
      max: [new Date().getFullYear(), "Established year cannot be in the future."],
      validate: {
        validator: (value: number | undefined) =>
          value === undefined || Number.isInteger(value),
        message: "Established year must be a whole number.",
      },
    },
    programs: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 30,
        message: "At most 30 programs are allowed.",
      },
    },
    degreeLevels: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 20,
        message: "At most 20 degree levels are allowed.",
      },
    },
    isPublished: { type: Boolean, required: true, default: false },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [70, "Meta title must be at most 70 characters."],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description must be at most 160 characters."],
    },
  },
  { timestamps: true }
);

// Global slug uniqueness (public URL routing); country-scoped listing order;
// publication-gated public queries.
UniversitySchema.index({ slug: 1 }, { unique: true });
UniversitySchema.index({ country: 1, isPublished: 1, updatedAt: -1 });
UniversitySchema.index({ isPublished: 1, updatedAt: -1 });

// Avoid duplicate model compilation during hot reload.
export const University: UniversityModel =
  (mongoose.models.University as UniversityModel | undefined) ??
  mongoose.model<UniversityDoc, UniversityModel>("University", UniversitySchema);

export interface UniversityCountryRef {
  id: string;
  name: string;
  slug: string;
}

/** JSON-safe shape. Country is embedded as a small ref, never a raw ObjectId. */
export interface SafeUniversity {
  id: string;
  name: string;
  slug: string;
  country: UniversityCountryRef;
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
  programs: string[];
  degreeLevels: string[];
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityRecordLike {
  _id: unknown;  name: string;
  slug: string;
  country:
    | { _id?: unknown; name?: string; slug?: string }
    | unknown;
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
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toCountryRef(
  country: UniversityRecordLike["country"],
  fallbackId: string
): UniversityCountryRef {
  if (country && typeof country === "object" && "slug" in country) {
    const ref = country as { _id?: unknown; name?: unknown; slug?: unknown };
    return {
      id: String(ref._id ?? fallbackId),
      name: typeof ref.name === "string" ? ref.name : "",
      slug: typeof ref.slug === "string" ? ref.slug : "",
    };
  }
  return { id: fallbackId, name: "", slug: "" };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function toSafeUniversity(doc: UniversityRecordLike): SafeUniversity {
  const countryId =
    doc.country && typeof doc.country === "object" && "_id" in (doc.country as object)
      ? String((doc.country as { _id: unknown })._id)
      : String(doc.country ?? "");
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    country: toCountryRef(doc.country, countryId),
    logoUrl: str(doc.logoUrl),
    logoPublicId: str(doc.logoPublicId),
    coverImageUrl: str(doc.coverImageUrl),
    coverImagePublicId: str(doc.coverImagePublicId),
    shortDescription: str(doc.shortDescription),
    description: str(doc.description),
    website: str(doc.website),
    city: str(doc.city),
    address: str(doc.address),
    establishedYear: num(doc.establishedYear),
    programs: Array.isArray(doc.programs) ? doc.programs.filter((p): p is string => typeof p === "string") : [],
    degreeLevels: Array.isArray(doc.degreeLevels)
      ? doc.degreeLevels.filter((d): d is string => typeof d === "string")
      : [],
    isPublished: doc.isPublished,
    metaTitle: str(doc.metaTitle),
    metaDescription: str(doc.metaDescription),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
