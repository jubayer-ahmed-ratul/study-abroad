import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { isCloudinaryConfigured } from "@/lib/env";
import { getUniversityById } from "@/lib/universities/service";
import { UniversityApiError } from "@/lib/universities/service";
import { listCountriesForSelect } from "@/lib/universities/service";
import UniversityForm from "@/components/admin/UniversityForm";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUniversityPage({ params }: EditPageProps) {
  // Request-time data (see note on the list page).
  await connection();
  const { id } = await params;

  let university;
  try {
    university = await getUniversityById(id);
  } catch (error) {
    if (error instanceof UniversityApiError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const countries = await listCountriesForSelect();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit: {university.name}
        </h1>
        <Link
          href="/admin/universities"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Back to list
        </Link>
      </div>
      <UniversityForm
        mode="edit"
        universityId={university.id}
        initial={university}
        initialCountryId={university.country.id}
        countries={countries}
        cloudinaryEnabled={isCloudinaryConfigured()}
      />
    </div>
  );
}
