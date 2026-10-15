/** Skeleton placeholders streamed instantly while country data loads. */

export function CountryGridSkeleton() {
  return (
    <ul aria-hidden className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <li
          key={index}
          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
        >
          <span className="animate-shimmer block h-28" />
          <span className="block space-y-2 p-5">
            <span className="animate-shimmer block h-5 w-2/3 rounded" />
            <span className="animate-shimmer block h-4 w-full rounded" />
            <span className="animate-shimmer block h-4 w-5/6 rounded" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CountryDetailSkeleton() {
  return (
    <span className="flex flex-col gap-6" aria-hidden>
      <span className="animate-shimmer block h-40 rounded-2xl" />
      <span className="animate-shimmer block h-5 w-full rounded" />
      <span className="animate-shimmer block h-5 w-full rounded" />
      <span className="animate-shimmer block h-5 w-4/6 rounded" />
    </span>
  );
}
