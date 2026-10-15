import { Suspense } from "react";

import { getCurrentAdminCached } from "@/lib/admin-session";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading dashboard…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // Layout already enforces admin access; the cached helper shares its lookup.
  const { admin } = await getCurrentAdminCached();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome{admin ? `, ${admin.name}` : ""}.
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {admin?.email} · role {admin?.role}. This is a Phase 1
          placeholder — Countries and Universities management arrives in Phase 2.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Countries</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Country CRUD is out of scope for Phase 1.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Universities</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            University CRUD is out of scope for Phase 1.
          </p>
        </div>
      </section>
    </div>
  );
}
