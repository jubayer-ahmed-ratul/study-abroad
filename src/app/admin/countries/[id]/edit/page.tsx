import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isCloudinaryConfigured } from "@/lib/env";
import { getCountryById } from "@/lib/countries/service";
import { CountryApiError } from "@/lib/countries/service";
import CountryForm from "@/components/admin/CountryForm";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCountryPage({ params }: EditPageProps) {
  // Request-time data (see public countries pages for why).
  await connection();
  const { id } = await params;

  let country;
  try {
    country = await getCountryById(id);
  } catch (error) {
    if (error instanceof CountryApiError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit: {country.name}
        </h1>
        <Link
          href="/admin/countries"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Back to list
        </Link>
      </div>
      <CountryForm
        mode="edit"
        countryId={country.id}
        initial={country}
        cloudinaryEnabled={isCloudinaryConfigured()}
      />
    </div>
  );
}
