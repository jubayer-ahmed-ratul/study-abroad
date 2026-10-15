import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getCountryWithUniversitiesCached } from "@/lib/universities/service";
import { UniversitiesSkeleton } from "@/components/universities/UniversitySkeletons";

interface CountryUniversitiesProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CountryUniversitiesProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCountryWithUniversitiesCached(slug);
  if (!result) return { title: "Destination not found" };
  return {
    title: `Universities in ${result.country.name}`,
    description: `Published universities in ${result.country.name} open for international admissions.`,
  };
}

export default function CountryUniversitiesPage({ params }: CountryUniversitiesProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <Suspense fallback={<UniversitiesSkeleton />}>
          <CountryUniversities params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function CountryUniversities({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCountryWithUniversitiesCached(slug);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div>
        <Link
          href={`/countries/${result.country.slug}`}
          className="w-fit text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
        >
          ← {result.country.name} guide
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Universities in {result.country.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {result.total} published {result.total === 1 ? "university" : "universities"}
        </p>
      </div>
      {result.universities.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          No universities published here yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {result.universities.map((university) => (
            <li key={university.id}>
              <Link
                href={`/universities/${university.slug}`}
                className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 hover:shadow-md dark:bg-zinc-950 dark:ring-zinc-800"
              >
                <span className="block font-semibold">{university.name}</span>
                {university.city ? (
                  <span className="block text-xs text-zinc-500">{university.city}</span>
                ) : null}
                {university.shortDescription ? (
                  <span className="mt-1 line-clamp-2 block text-sm text-zinc-600 dark:text-zinc-400">
                    {university.shortDescription}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
