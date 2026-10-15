import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getPublishedCountryBySlugCached } from "@/lib/countries/service";

interface CountryDetailProps {
  params: Promise<{ slug: string }>;
}

// Per-request rendering, like the list page: always-fresh data and no
// prerender-bailout noise in production logs.
export const instant = false;

export async function generateMetadata({ params }: CountryDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const country = await getPublishedCountryBySlugCached(slug);
  if (!country) return { title: "Destination not found" };
  return {
    title: country.metaTitle || `Study in ${country.name}`,
    description:
      country.metaDescription || country.shortDescription || `Study abroad in ${country.name}.`,
  };
}

export default function CountryDetailPage({ params }: CountryDetailProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      <Link href="/countries" className="w-fit text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
        ← All destinations
      </Link>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading destination…</p>}>
        <CountryDetail params={params} />
      </Suspense>
    </main>
  );
}

async function CountryDetail({ params }: { params: Promise<{ slug: string }> }) {
  // Same request-time guarantee as the list page (see note there).
  await connection();
  const { slug } = await params;
  const country = await getPublishedCountryBySlugCached(slug);
  if (!country) notFound();

  return (
    <>
      <div className="flex items-center gap-4">
        {country.flagImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={country.flagImageUrl}
            alt={`Flag of ${country.name}`}
            className="h-16 w-auto rounded border"
          />
        ) : null}
        <h1 className="text-3xl font-semibold">Study in {country.name}</h1>
      </div>
      {country.shortDescription ? (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">{country.shortDescription}</p>
      ) : null}
      {country.description ? (
        <p className="whitespace-pre-line text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          {country.description}
        </p>
      ) : null}
    </>
  );
}
