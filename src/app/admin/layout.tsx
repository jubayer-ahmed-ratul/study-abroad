import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentAdminCached } from "@/lib/admin-session";
import LogoutButton from "@/components/admin/LogoutButton";

// Admin area is session-dependent and renders per request (Next 16
// cacheComponents: opts out of static-shell validation for /admin).
export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { status, admin } = await getCurrentAdminCached();
  if (status !== "ok" || !admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Study Abroad Admin</p>
            <p className="text-xs text-zinc-500">{admin.email}</p>
          </div>
          <LogoutButton />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 px-4 pb-3 text-sm">
          <Link
            href="/admin"
            className="rounded-full bg-zinc-900 px-3 py-1 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/countries"
            className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300"
          >
            Countries
          </Link>
          <span
            aria-disabled
            title="Coming in Phase 3"
            className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
          >
            Universities · soon
          </span>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
