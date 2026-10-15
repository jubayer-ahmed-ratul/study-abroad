import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  getPublishedUniversityBySlugCached,
  listPublishedUniversitySlugs,
  listRelatedUniversitiesCached,
} from "@/lib/universities/service";
import { UniversityDetailSkeleton } from "@/components/universities/UniversitySkeletons";

interface UniversityDetailProps {
  params: Promise<{ slug: string }>;
}

// Pre-render published universities at build time (ISR); the double gate
// (university + country published) is enforced inside the queries, so
// unpublishing either side removes the page via revalidation.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await listPublishedUniversitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: UniversityDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const university = await getPublishedUniversityBySlugCached(slug);
  if (!university) return { title: "University not found" };
  return {
    title: university.metaTitle || `${university.name} — Study in ${university.country.name}`,
    description:
      university.metaDescription ||
      university.shortDescription ||
      `Study at ${university.name} in ${university.country.name}.`,
  };
}

export default function UniversityDetailPage({ params }: UniversityDetailProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <Link href="/universities" className="w-fit text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
          ← All universities
        </Link>
      </div>
      <Suspense fallback={<UniversityDetailSkeleton />}>
        <UniversityDetail params={params} />
      </Suspense>
    </main>
  );
}

async function UniversityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const university = await getPublishedUniversityBySlugCached(slug);
  if (!university) notFound();

  const related = await listRelatedUniversitiesCached(university.id, university.country.id, 3);

  return (
    <div className="animate-fade-up mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <section className="rounded-2xl bg-zinc-900 px-6 py-8 dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
        <div className="flex items-center gap-4">
          {university.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={university.logoUrl} alt={`Logo of ${university.name}`} className="h-16 w-auto rounded-lg bg-white p-1" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl font-bold text-white ring-1 ring-white/20">
              {university.name.charAt(0)}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              <Link
                href={`/countries/${university.country.slug}`}
                className="hover:text-zinc-200"
              >
                {university.country.name}
              </Link>
              {university.city ? ` · ${university.city}` : ""}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white">{university.name}</h1>
          </div>
        </div>
        {university.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={university.coverImageUrl}
            alt={`${university.name} campus`}
            className="mt-5 h-48 w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : null}
      </section>

      {(university.establishedYear || university.website) && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {university.establishedYear ? (
            <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Established</dt>
              <dd className="mt-1 font-semibold">{university.establishedYear}</dd>
            </div>
          ) : null}
          {university.website ? (
            <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <dt className="text-xs uppercase tracking-wider text-zinc-500">Website</dt>
              <dd className="mt-1 font-semibold">
                <a
                  href={university.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-900 underline dark:text-zinc-100"
                >
                  Visit site
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      {university.shortDescription ? (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">{university.shortDescription}</p>
      ) : null}

      {university.description ? (
        <article className="rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
          {university.description.split(/\n\n+/).map((paragraph, index) => (
            <p key={index} className="mb-4 text-[15px] leading-7 text-zinc-700 last:mb-0 dark:text-zinc-300">
              {paragraph}
            </p>
          ))}
        </article>
      ) : null}

      {university.programs.length > 0 || university.degreeLevels.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {university.programs.length > 0 ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <h2 className="font-medium">Programs</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {university.programs.map((program) => (
                  <li key={program}>{program}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {university.degreeLevels.length > 0 ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <h2 className="font-medium">Degree levels</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {university.degreeLevels.map((level) => (
                  <li key={level}>{level}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {related.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">More in {university.country.name}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/universities/${item.slug}`}
                  className="block rounded-xl bg-white p-4 ring-1 ring-zinc-200 hover:shadow-md dark:bg-zinc-950 dark:ring-zinc-800"
                >
                  <span className="block font-medium">{item.name}</span>
                  {item.city ? (
                    <span className="block text-xs text-zinc-500">{item.city}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
