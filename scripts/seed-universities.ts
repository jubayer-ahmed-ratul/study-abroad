/**
 * Seed a starter set of well-known universities linked to seeded countries.
 * Idempotent: existing slugs are skipped, never overwritten.
 *
 *   npm run seed-universities
 *
 * Reads connection info from .env.local (git-ignored). Only links to
 * countries that already exist; skips entries whose country is missing.
 */
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Country } from "@/models/Country";
import { University } from "@/models/University";
import { validateUniversityInput } from "@/lib/universities/validation";

interface SeedUniversity {
  name: string;
  slug: string;
  countrySlug: string;
  city: string;
  shortDescription: string;
  description: string;
  website: string;
  establishedYear: number;
  programs: string[];
  degreeLevels: string[];
}

const UNIVERSITIES: SeedUniversity[] = [
  {
    name: "University of Toronto",
    slug: "university-of-toronto",
    countrySlug: "canada",
    city: "Toronto",
    shortDescription: "Canada's top-ranked research university in the heart of Toronto.",
    description: `The University of Toronto consistently ranks as Canada's best university and among the top 25 worldwide. Its St. George campus sits in downtown Toronto, with renowned programs in computer science, engineering, medicine, and business through Rotman.

International students join a community of 190,000+ learners with extensive co-op, research assistant, and exchange opportunities. Graduates qualify for three-year post-graduation work permits.

Toronto itself is one of the world's most multicultural cities and Canada's economic engine — internships and part-time roles are plentiful.`,
    website: "https://www.utoronto.ca",
    establishedYear: 1827,
    programs: ["Computer Science", "Engineering", "Business Administration", "Medicine", "Data Science"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
  {
    name: "McGill University",
    slug: "mcgill-university",
    countrySlug: "canada",
    city: "Montreal",
    shortDescription: "Historic English-language research university in affordable Montreal.",
    description: `McGill University in Montreal is one of Canada's oldest and most prestigious institutions, famous for medicine, law, and neuroscience. It draws students from over 150 countries to its iconic downtown campus beneath Mount Royal.

Tuition is lower than Toronto or Vancouver peers, and Montreal's rents are among Canada's most student-friendly. Quebec's immigration streams add a distinct post-study pathway on top of federal options.

Strong choice for students who want Ivy-caliber academics with European-flavored city life at a discount.`,
    website: "https://www.mcgill.ca",
    establishedYear: 1821,
    programs: ["Medicine", "Law", "Neuroscience", "Engineering", "Management"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
  {
    name: "University of British Columbia",
    slug: "university-of-british-columbia",
    countrySlug: "canada",
    city: "Vancouver",
    shortDescription: "Pacific-rim research powerhouse consistently in the global top 40.",
    description: `UBC's Vancouver campus pairs top-40 global rankings with ocean-and-mountain scenery. Standout faculties include forestry, computer science, medicine, and the Sauder School of Business.

Vancouver's mild climate and Asia-Pacific business links attract huge international cohorts, and BC's provincial nominee program favors local graduates. Co-op placements run deep into the city's tech and green-energy sectors.

Ideal for students pairing elite academics with outdoor life — skiing, kayaking, and hiking all within an hour.`,
    website: "https://www.ubc.ca",
    establishedYear: 1908,
    programs: ["Computer Science", "Forestry", "Business", "Medicine", "Oceanography"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
  {
    name: "Massachusetts Institute of Technology",
    slug: "massachusetts-institute-of-technology",
    countrySlug: "united-states",
    city: "Cambridge",
    shortDescription: "The world's most famous institute for science and technology.",
    description: `MIT needs little introduction: the global benchmark for engineering, computer science, economics, and the physical sciences. Its Undergraduate Research Opportunities Program puts even first-years into real labs.

Admission is brutally competitive, but need-blind aid for all students — including internationals — makes it affordable for those admitted. Graduates feed directly into Silicon Valley, Wall Street quant desks, and academia worldwide.

Best suited to students with exceptional STEM records aiming at research or deep-tech careers.`,
    website: "https://www.mit.edu",
    establishedYear: 1861,
    programs: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Economics", "Physics"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
  {
    name: "Stanford University",
    slug: "stanford-university",
    countrySlug: "united-states",
    city: "Stanford",
    shortDescription: "Silicon Valley's home university and startup factory.",
    description: `Stanford sits at the center of Silicon Valley, and its alumni networks practically are the tech industry. Computer science, business (GSB), law, and medicine all rank at or near number one worldwide.

The campus operates like an innovation ecosystem: hackathons, venture funding, and founder culture are part of daily life. California sunshine and a sprawling palm-lined campus don't hurt either.

Need-based aid applies to international students, though admission rates sit in the low single digits.`,
    website: "https://www.stanford.edu",
    establishedYear: 1885,
    programs: ["Computer Science", "Business Administration", "Law", "Medicine", "Design"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
  {
    name: "University of Oxford",
    slug: "university-of-oxford",
    countrySlug: "united-kingdom",
    city: "Oxford",
    shortDescription: "Nine centuries of scholarship in the world's most storied university city.",
    description: `Oxford's tutorial system — weekly one-on-one or small-group sessions with experts — remains unique in higher education. PPE, medicine, law, and computer science draw the planet's strongest applicants.

UK undergraduate degrees run three years and master's just one, compressing total cost despite high international fees. Colleges provide housing, dining, and tight-knit communities inside the larger university.

The Graduate Route adds two years of UK work rights after the degree — a fast, prestigious path into London careers.`,
    website: "https://www.ox.ac.uk",
    establishedYear: 1096,
    programs: ["Philosophy Politics and Economics", "Medicine", "Law", "Computer Science", "Engineering"],
    degreeLevels: ["Bachelor's", "Master's", "PhD"],
  },
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();
  if (!uri || !dbName) {
    console.error("seed-universities: MONGODB_URI and MONGODB_DB must be set.");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });

  try {
    const countries = await Country.find({}).select("_id slug isPublished").lean().exec();
    const bySlug = new Map(countries.map((c) => [c.slug, c]));
    const existing = new Set<string>(
      (await University.find({}).select("slug").lean().exec()).map((d) => d.slug)
    );

    let created = 0;
    let skipped = 0;
    for (const seed of UNIVERSITIES) {
      if (existing.has(seed.slug)) {
        skipped++;
        continue;
      }
      const country = bySlug.get(seed.countrySlug);
      if (!country) {
        console.error(`seed-universities: missing country ${seed.countrySlug}, skipping ${seed.slug}.`);
        continue;
      }
      const validation = validateUniversityInput(
        {
          name: seed.name,
          slug: seed.slug,
          country: String(country._id),
          city: seed.city,
          shortDescription: seed.shortDescription,
          description: seed.description,
          website: seed.website,
          establishedYear: seed.establishedYear,
          programs: seed.programs,
          degreeLevels: seed.degreeLevels,
          metaTitle: `${seed.name} — Admissions, Programs & Costs`,
          metaDescription: seed.shortDescription,
          isPublished: true,
        },
        false
      );
      if (!validation.ok) {
        console.error(`seed-universities: invalid ${seed.slug}: ${validation.errors.join("; ")}`);
        continue;
      }
      await University.create({
        ...validation.data,
        country: new mongoose.Types.ObjectId(validation.data.country),
        isPublished: true,
      });
      created++;
    }

    await University.createIndexes();
    console.log(`seed-universities: created=${created} skipped=${skipped} total=${UNIVERSITIES.length}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(
    `seed-universities: ${message.replace(/mongodb(\+srv)?:\/\/[^/\s]+/i, "<redacted-uri>").slice(0, 300)}`
  );
  process.exit(1);
});
