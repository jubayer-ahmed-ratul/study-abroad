/**
 * Warm the public country cache after a deploy or bulk import.
 * Fetches the list page plus every published detail page once so the
 * shared cache is filled and visitors never pay the cold MongoDB lookup.
 *
 *   npm run warm-countries -- --base https://your-app.vercel.app
 *
 * Defaults to http://localhost:3000. Reads published slugs from MongoDB
 * via .env.local (git-ignored). Warms country pages, university pages,
 * and country sub-lists.
 */
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Country } from "@/models/Country";
import { University } from "@/models/University";

function readFlag(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) {
    const value = process.argv[index + 1];
    if (value && !value.startsWith("--")) return value;
  }
  return fallback;
}

async function main(): Promise<void> {
  const base = readFlag("base", process.env.WARM_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );

  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();
  if (!uri || !dbName) {
    console.error("warm-countries: MONGODB_URI and MONGODB_DB must be set.");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });
  let slugs: string[] = [];
  let universitySlugs: string[] = [];
  try {
    slugs = (
      await Country.find({ isPublished: true }).select("slug").lean().exec()
    ).map((d) => d.slug);
    universitySlugs = (
      await University.find({ isPublished: true }).select("slug").lean().exec()
    ).map((d) => d.slug);
  } finally {
    await mongoose.disconnect();
  }

  const urls = [
    `${base}/countries`,
    `${base}/universities`,
    ...slugs.map((s) => `${base}/countries/${s}`),
    ...slugs.map((s) => `${base}/countries/${s}/universities`),
    ...universitySlugs.map((s) => `${base}/universities/${s}`),
  ];
  let ok = 0;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      // Consume the streamed body so PPR finishes rendering server-side.
      await response.text();
      if (response.ok) ok++;
      else console.error(`warm-countries: ${response.status} ${url}`);
    } catch (error) {
      console.error(
        `warm-countries: failed ${url} (${error instanceof Error ? error.message : "unknown"})`
      );
    }
  }
  console.log(`warm-countries: warmed=${ok}/${urls.length}`);
}

main().catch((error: unknown) => {
  console.error(`warm-countries: ${error instanceof Error ? error.message : "unknown"}`);
  process.exit(1);
});
