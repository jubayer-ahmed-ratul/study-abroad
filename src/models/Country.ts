import mongoose, { type Model, Schema } from "mongoose";

import { COUNTRY_SLUG_PATTERN } from "@/lib/countries/validation";

export interface CountryAttrs {
  name: string;
  slug: string;
  flagImageUrl?: string;
  flagImagePublicId?: string;
  shortDescription?: string;
  description?: string;
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface CountryDoc extends CountryAttrs, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type CountryModel = Model<CountryDoc>;

const CountrySchema = new Schema<CountryDoc, CountryModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [120, "Name must be at most 120 characters."],
    },
    slug: {
      type: String,
      required: [true, "Slug is required."],
      trim: true,
      lowercase: true,
      minlength: [2, "Slug must be at least 2 characters."],
      maxlength: [120, "Slug must be at most 120 characters."],
      match: [COUNTRY_SLUG_PATTERN, "Slug may contain lowercase letters, numbers, and hyphens only."],
    },
    flagImageUrl: {
      type: String,
      trim: true,
      maxlength: [2048, "Image URL is too long."],
    },
    flagImagePublicId: {
      type: String,
      trim: true,
      maxlength: [300, "Image public ID is too long."],
    },
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
    isPublished: {
      type: Boolean,
      required: true,
      default: false,
    },
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

// Unique URL slugs; published-listing query pattern.
CountrySchema.index({ slug: 1 }, { unique: true });
CountrySchema.index({ isPublished: 1, updatedAt: -1 });

// Avoid duplicate model compilation during hot reload.
export const Country: CountryModel =
  (mongoose.models.Country as CountryModel | undefined) ??
  mongoose.model<CountryDoc, CountryModel>("Country", CountrySchema);

/** JSON-safe shape (all fields are public; _id serialized as id). */
export interface SafeCountry extends CountryAttrs {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Structural input so both hydrated docs and lean query results work. */
export interface CountryRecord extends CountryAttrs {
  _id: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeCountry(doc: CountryRecord): SafeCountry {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    flagImageUrl: doc.flagImageUrl,
    flagImagePublicId: doc.flagImagePublicId,
    shortDescription: doc.shortDescription,
    description: doc.description,
    isPublished: doc.isPublished,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
