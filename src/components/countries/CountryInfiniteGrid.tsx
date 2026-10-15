"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { SafeCountry } from "@/models/Country";
import { getCountriesPage } from "@/app/countries/actions";
import { COUNTRIES_PAGE_SIZE } from "@/lib/countries/pagination";
import { CountryGridSkeleton } from "@/components/countries/CountrySkeletons";

const CARD_ACCENTS = [
  "from-sky-500 to-blue-700",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-purple-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-sky-700",
];

interface CountryInfiniteGridProps {
  initial: SafeCountry[];
  total: number;
}

export default function CountryInfiniteGrid({ initial, total }: CountryInfiniteGridProps) {
  const [items, setItems] = useState<SafeCountry[]>(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ loading: false, page: 1 });
  stateRef.current.page = page;

  const hasMore = items.length < total;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || stateRef.current.loading) return;
        stateRef.current.loading = true;
        setLoading(true);
        setError(false);
        const nextPage = stateRef.current.page + 1;
        getCountriesPage(nextPage).then(
          (result) => {
            stateRef.current.loading = false;
            setLoading(false);
            setItems((current) => {
              const known = new Set(current.map((country) => country.id));
              return [...current, ...result.items.filter((country) => !known.has(country.id))];
            });
            setPage(nextPage);
          },
          () => {
            stateRef.current.loading = false;
            setLoading(false);
            setError(true);
          }
        );
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        No destinations published yet. Check back soon.
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Showing {items.length} of {total} destinations
      </p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((country, index) => (
          <li
            key={country.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index % COUNTRIES_PAGE_SIZE, 8) * 60}ms` }}
          >
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
      {hasMore ? (
        <div ref={sentinelRef} aria-hidden className="mt-5">
          {loading || error ? (
            <CountryGridSkeleton />
          ) : null}
          {error && !loading ? (
            <p className="mt-4 text-center text-sm text-red-600">
              Couldn&apos;t load more — scroll again to retry.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-zinc-500">
          You&apos;ve seen all {total} destinations.
        </p>
      )}
    </>
  );
}
