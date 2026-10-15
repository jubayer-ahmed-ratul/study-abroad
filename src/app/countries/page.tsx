import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { listPublishedCountriesCached } from "@/lib/countries/service";

export const metadata: Metadata = {
  title: "Study destinations",
  description: "Browse published study-abroad destinations.",
};

// Per-request rendering: country data must always be fresh (unpublish takes
// effect immediately), and database reads are incompatible with static
// prerendering under the cacheComponents rules.
export const instant = false;

const CARD_ACCENTS = [
  "from-sky-500 to-blue-700",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-sky-700",
];

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
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading destinations…</p>}>
          <CountryGrid />
        </Suspense>
      </section>
    </main>
  );
}

async function CountryGrid() {
  // Force request-time rendering: the MongoDB driver reads the clock during
  // queries, which static prerendering forbids. Data stays always fresh.
  await connection();
  const countries = await listPublishedCountriesCached();

  if (countries.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        No destinations published yet. Check back soon.
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {countries.length} destinations
      </p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((country, index) => (
          <li key={country.id}>
            <Link
              href={`/countries/${country.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-950 dark:ring-zinc-800"
            >
              <span
                className={`flex h-28 items-center justify-between bg-gradient-to-r px-5 ${
                  CARD_ACCENTS[index % CARD_ACCENTS.length]
                }`}
              >
                <span className="text-4xl font-bold text-white/95">
                  {country.name.charAt(0)}
                </span>
                {country.flagImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={country.flagImageUrl}
                    alt=""
                    className="h-12 w-auto rounded border border-white/40 bg-white/10"
                    loading="lazy"
                  />
                ) : null}
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-50">
                  {country.name}
                </span>
                {country.shortDescription ? (
                  <span className="mt-1.5 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {country.shortDescription}
                  </span>
                ) : null}
                <span className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Explore guide <span aria-hidden>→</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
