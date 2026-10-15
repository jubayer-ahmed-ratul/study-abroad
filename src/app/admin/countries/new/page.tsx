import Link from "next/link";
import { connection } from "next/server";

import { isCloudinaryConfigured } from "@/lib/env";
import CountryForm from "@/components/admin/CountryForm";

export default async function NewCountryPage() {
  // Read env at request time: build-time prerender would bake a stale
  // "Cloudinary unconfigured" flag if vars are added after the first build.
  await connection();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">New country</h1>
        <Link
          href="/admin/countries"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Back to list
        </Link>
      </div>
      <CountryForm mode="create" cloudinaryEnabled={isCloudinaryConfigured()} />
    </div>
  );
}
