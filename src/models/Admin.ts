import mongoose, { type Model, Schema, type HydratedDocument } from "mongoose";

export const ADMIN_ROLE = "admin" as const;

export interface AdminAttrs {
  name: string;
  email: string;
  passwordHash: string;
  role: typeof ADMIN_ROLE;
  isActive: boolean;
}

export interface AdminDoc extends AdminAttrs, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type AdminModel = Model<AdminDoc>;

export type AdminHydrated = HydratedDocument<AdminDoc>;

/** Normalize email: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const AdminSchema = new Schema<AdminDoc, AdminModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [100, "Name must be at most 100 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email must be at most 254 characters."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email must be valid."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
      // Never selected by default; explicitly select only for verification.
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: [ADMIN_ROLE],
      default: ADMIN_ROLE,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

AdminSchema.index({ email: 1 }, { unique: true });

// Avoid duplicate model compilation during hot reload.
export const Admin: AdminModel =
  (mongoose.models.Admin as AdminModel | undefined) ??
  mongoose.model<AdminDoc, AdminModel>("Admin", AdminSchema);

/** Safe admin shape for API responses — never includes passwordHash. */
export interface SafeAdmin {
  id: string;
  name: string;
  email: string;
  role: typeof ADMIN_ROLE;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeAdmin(doc: AdminDoc): SafeAdmin {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
