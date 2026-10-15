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
// prerendering under the cacheComponents rules. This also avoids per-request
// prerender-bailout noise in production logs.
export const instant = false;

export default function CountriesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Study destinations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Explore countries open for applications.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading destinations…</p>}>
        <CountryGrid />
      </Suspense>
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
    <ul className="grid gap-4 sm:grid-cols-2">
      {countries.map((country) => (
        <li key={country.id}>
          <Link
            href={`/countries/${country.slug}`}
            className="block rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800"
          >
            {country.flagImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={country.flagImageUrl}
                alt={`Flag of ${country.name}`}
                className="mb-3 h-12 w-auto rounded border"
                loading="lazy"
              />
            ) : null}
            <h2 className="font-medium">{country.name}</h2>
            {country.shortDescription ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {country.shortDescription}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
