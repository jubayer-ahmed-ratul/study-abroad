import Link from "next/link";
import { connection } from "next/server";

import { listCountries } from "@/lib/countries/service";
import { DeleteCountry, PublishToggle } from "@/components/admin/CountryActions";

interface CountriesPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

const PAGE_SIZE = 10;

function pageHref(q: string, status: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/countries${query ? `?${query}` : ""}`;
}

export default async function AdminCountriesPage({ searchParams }: CountriesPageProps) {
  // Request-time data (see public countries pages for why).
  await connection();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status === "published" || params.status === "draft" ? params.status : "all";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const result = await listCountries({ q: q || undefined, status, page, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Countries</h1>
        <Link
          href="/admin/countries/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New country
        </Link>
      </div>

      <form
        method="get"
        action="/admin/countries"
        className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm sm:flex-row dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium sm:self-end dark:border-zinc-700"
        >
          Apply
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-zinc-600 shadow-sm dark:bg-zinc-950 dark:text-zinc-400">
          {q || status !== "all"
            ? "No countries match your filters."
            : "No countries yet. Create the first one."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((country) => (
                <tr key={country.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-3 font-medium">{country.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">/{country.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        country.isPublished
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}
                    >
                      {country.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(country.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/admin/countries/${country.id}/edit`}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      >
                        Edit
                      </Link>
                      <PublishToggle id={country.id} isPublished={country.isPublished} />
                      <DeleteCountry id={country.id} name={country.name} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          Page {result.page} of {result.totalPages} · {result.total} total
        </p>
        <p className="inline-flex gap-2">
          {result.page > 1 ? (
            <Link
              href={pageHref(q, status, result.page - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            >
              Previous
            </Link>
          ) : null}
          {result.page < result.totalPages ? (
            <Link
              href={pageHref(q, status, result.page + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            >
              Next
            </Link>
          ) : null}
        </p>
      </div>
    </div>
  );
}
