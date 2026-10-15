import "server-only";

import { cache } from "react";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ADMIN_ROLE, Admin, type SafeAdmin, toSafeAdmin } from "@/models/Admin";

export interface AdminCheck {
  status: "ok" | "unauthenticated" | "forbidden";
  admin: SafeAdmin | null;
}

/**
 * Server-side authority for admin access. Verifies the signed session AND
 * re-validates the account in MongoDB on every call, so deactivated admins
 * lose access promptly even with a valid JWT.
 */
export async function getCurrentAdmin(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== ADMIN_ROLE) {
    return { status: "unauthenticated", admin: null };
  }

  await connectToDatabase();
  const admin = await Admin.findById(session.user.id).exec();
  if (!admin || !admin.isActive || admin.role !== ADMIN_ROLE) {
    return { status: "forbidden", admin: null };
  }

  return { status: "ok", admin: toSafeAdmin(admin) };
}

/**
 * Request-cached wrapper so the admin layout and dashboard page share a
 * single MongoDB lookup per request instead of querying twice.
 */
export const getCurrentAdminCached = cache(getCurrentAdmin);
