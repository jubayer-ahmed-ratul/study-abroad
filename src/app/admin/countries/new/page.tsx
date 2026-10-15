import Link from "next/link";

import { isCloudinaryConfigured } from "@/lib/env";
import CountryForm from "@/components/admin/CountryForm";

export default function NewCountryPage() {
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
