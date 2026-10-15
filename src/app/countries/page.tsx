import type { Metadata } from "next";
import { Suspense } from "react";

import { CountryGridSkeleton } from "@/components/countries/CountrySkeletons";
import CountryInfiniteGrid from "@/components/countries/CountryInfiniteGrid";
import { COUNTRIES_PAGE_SIZE } from "@/lib/countries/pagination";
import { listPublishedCountriesPaginated } from "@/lib/countries/service";

export const metadata: Metadata = {
  title: "Study destinations",
  description: "Browse published study-abroad destinations.",
};

// Per-request rendering: country data must always be fresh (unpublish takes
// effect immediately), and database reads are incompatible with static
// prerendering under the cacheComponents rules.
export const instant = false;

export default function CountriesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <section className="mx-auto max-w-5xl px-4 pb-4 pt-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Study abroad destinations
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-4xl font-bold text-transparent dark:from-zinc-50 dark:to-zinc-400">
          Where will you study next?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Compare top study destinations — universities, tuition, living costs,
          work rights, and visa routes — picked for Bangladeshi students
          planning their future abroad.
        </p>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Suspense fallback={<CountryGridSkeleton />}>
          <CountryGrid />
        </Suspense>
      </section>
    </main>
  );
}

async function CountryGrid() {
  const first = await listPublishedCountriesPaginated(1, COUNTRIES_PAGE_SIZE);

  return (
    <CountryInfiniteGrid initial={first.items} total={first.total} />
  );
}
