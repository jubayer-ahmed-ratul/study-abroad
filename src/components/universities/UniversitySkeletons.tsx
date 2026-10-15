/** Skeleton placeholders streamed instantly while university data loads. */

export function UniversitiesSkeleton() {
  return (
    <ul aria-hidden className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800"
        >
          <span className="block space-y-2">
            <span className="animate-shimmer block h-5 w-2/3 rounded" />
            <span className="animate-shimmer block h-4 w-full rounded" />
            <span className="animate-shimmer block h-4 w-5/6 rounded" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UniversityDetailSkeleton() {
  return (
    <span className="flex flex-col gap-6" aria-hidden>
      <span className="animate-shimmer block h-40 rounded-2xl" />
      <span className="animate-shimmer block h-5 w-full rounded" />
      <span className="animate-shimmer block h-5 w-full rounded" />
      <span className="animate-shimmer block h-5 w-4/6 rounded" />
    </span>
  );
}
