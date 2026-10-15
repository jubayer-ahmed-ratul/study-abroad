import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  getPublishedCountryBySlugCached,
  listPublishedCountriesCached,
} from "@/lib/countries/service";

interface CountryDetailProps {
  params: Promise<{ slug: string }>;
}

// Per-request rendering, like the list page: always-fresh data and no
// prerender-bailout noise in production logs.
export const instant = false;

// Pre-render every published country at build time so detail pages serve
// from the edge cache (ISR). Mutations purge via revalidatePath/Tags.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const countries = await listPublishedCountriesCached();
  return countries.map((country) => ({ slug: country.slug }));
}

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
  const { slug } = await params;
  const country = await getPublishedCountryBySlugCached(slug);
  if (!country) notFound();

  const initial = country.name.charAt(0);

  return (
    <>
      <section className="-mx-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-10 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="mx-auto flex max-w-3xl items-center gap-5">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl font-bold text-white ring-1 ring-white/20">
            {initial}
          </span>
          <span>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Study destination guide
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">Study in {country.name}</h1>
            {country.shortDescription ? (
              <p className="mt-2 text-sm leading-6 text-zinc-300">{country.shortDescription}</p>
            ) : null}
          </span>
        </div>
      </section>
      {country.flagImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={country.flagImageUrl}
          alt={`Flag of ${country.name}`}
          className="h-20 w-auto rounded-lg border"
        />
      ) : null}
      {country.description ? (
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          {country.description.split(/\n\n+/).map((paragraph, index) => (
            <p
              key={index}
              className="mb-4 text-[15px] leading-7 text-zinc-700 last:mb-0 dark:text-zinc-300"
            >
              {paragraph}
            </p>
          ))}
        </article>
      ) : null}
      <p className="text-xs text-zinc-400">
        Last updated {new Date(country.updatedAt).toLocaleDateString()}
      </p>
    </>
  );
}
