"use server";

import { COUNTRIES_PAGE_SIZE } from "@/lib/countries/pagination";
import { listPublishedCountriesPaginated } from "@/lib/countries/service";

/** Published-only page fetch for infinite scroll. Page numbers start at 1. */
export async function getCountriesPage(page: number) {
  const safePage = Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1;
  return listPublishedCountriesPaginated(safePage, COUNTRIES_PAGE_SIZE);
}
