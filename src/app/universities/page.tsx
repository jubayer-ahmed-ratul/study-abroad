import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { listCountriesForSelect } from "@/lib/universities/service";
import { listPublishedUniversitiesCached } from "@/lib/universities/service";
import { UniversitiesSkeleton } from "@/components/universities/UniversitySkeletons";

export const metadata: Metadata = {
  title: "Universities",
  description: "Browse published universities open for international admissions.",
};

interface UniversitiesPageProps {
  searchParams: Promise<{ q?: string; country?: string; page?: string }>;
}

const PAGE_SIZE = 12;

export default function UniversitiesPage({ searchParams }: UniversitiesPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <section className="mx-auto max-w-5xl px-4 pb-4 pt-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Universities
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-4xl font-bold text-transparent dark:from-zinc-50 dark:to-zinc-400">
          Find your university
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Published universities in published destinations only.
        </p>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Suspense fallback={<UniversitiesSkeleton />}>
          <UniversityResults searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function UniversityResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; page?: string }>;
}) {
  // Request-time data (same prerender constraints as country pages).
  await connection();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const country = (params.country ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [result, countries] = await Promise.all([
    listPublishedUniversitiesCached({
      q: q || undefined,
      countrySlug: country || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    listCountriesForSelect(),
  ]);

  // Country filter options show published destinations with universities.
  // (Admin-only data source reused read-only; names only, no secrets.)
  const publishedCountries = countries.filter((option) => option.isPublished);

  const pageHref = (nextPage: number): string => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (country) next.set("country", country);
    if (nextPage > 1) next.set("page", String(nextPage));
    const query = next.toString();
    return `/universities${query ? `?${query}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <form
        method="get"
        action="/universities"
        className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm sm:flex-row dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search universities…"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Country</span>
          <select
            name="country"
            defaultValue={country}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All countries</option>
            {publishedCountries.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Apply
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          No universities match. Try a different search.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {result.items.map((university, index) => (
            <li
              key={university.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <Link
                href={`/universities/${university.slug}`}
                className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-950 dark:ring-zinc-800"
              >
                <span className="flex items-center gap-3">
                  {university.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={university.logoUrl} alt="" className="h-10 w-auto rounded" loading="lazy" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {university.name.charAt(0)}
                    </span>
                  )}
                  <span>
                    <span className="block font-semibold">{university.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {university.country.name}
                      {university.city ? ` · ${university.city}` : ""}
                    </span>
                  </span>
                </span>
                {university.shortDescription ? (
                  <span className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {university.shortDescription}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          Page {result.page} of {result.totalPages} · {result.total} total
        </p>
        <p className="inline-flex gap-2">
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
              Previous
            </Link>
          ) : null}
          {result.page < result.totalPages ? (
            <Link href={pageHref(result.page + 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
              Next
            </Link>
          ) : null}
        </p>
      </div>
    </div>
  );
}
