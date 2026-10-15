import Link from "next/link";
import { connection } from "next/server";

import { isCloudinaryConfigured } from "@/lib/env";
import { listCountriesForSelect } from "@/lib/universities/service";
import UniversityForm from "@/components/admin/UniversityForm";

export default async function NewUniversityPage() {
  // Request-time data (country list must reflect the current database).
  await connection();
  const countries = await listCountriesForSelect();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New university</h1>
        <Link
          href="/admin/universities"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Back to list
        </Link>
      </div>
      <UniversityForm mode="create" countries={countries} cloudinaryEnabled={isCloudinaryConfigured()} />
    </div>
  );
}
