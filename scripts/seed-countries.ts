/**
 * Seed 20 study-abroad destination countries with full descriptions.
 * Idempotent: existing slugs are skipped, never overwritten.
 *
 *   npm run seed-countries
 *
 * Reads connection info from .env.local (git-ignored).
 */
import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Country } from "@/models/Country";
import { validateCountryInput } from "@/lib/countries/validation";

interface SeedCountry {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
}

const COUNTRIES: SeedCountry[] = [
  {
    name: "Canada",
    slug: "canada",
    shortDescription: "Top-ranked universities, post-study work rights, and a clear path to permanent residency.",
    description: `Canada hosts world-class institutions such as the University of Toronto, McGill, and UBC, with comparatively affordable tuition for international students. Most study programs qualify you for a Post-Graduation Work Permit of up to three years.

Living costs vary by city: expect higher budgets for Toronto and Vancouver, and far lower costs in Montreal, Ottawa, or the Atlantic provinces. Healthcare coverage for students depends on the province, so check requirements before you fly.

Canada's Express Entry system rewards Canadian education and work experience, making it one of the most immigration-friendly destinations for graduates who want to settle permanently.`,
  },
  {
    name: "United States",
    slug: "united-states",
    shortDescription: "The largest university system in the world, from Ivy League icons to affordable state schools.",
    description: `The US is home to MIT, Stanford, Harvard, and hundreds of excellent public universities like UC Berkeley, Michigan, and Georgia Tech. The sheer variety means there is a strong program for almost every field and budget.

Costs are high at private universities, but generous merit scholarships, assistantships, and on-campus jobs help many students. F-1 students can work on campus and apply for OPT work authorization after graduation, with a STEM extension of up to three years.

Each state feels like a different country: tech in California and Texas, finance in New York, research hubs around Boston. Pick your city as carefully as your university.`,
  },
  {
    name: "United Kingdom",
    slug: "united-kingdom",
    shortDescription: "Oxford, Cambridge, and one-year master's degrees in the heart of London and beyond.",
    description: `The UK combines ancient institutions like Oxford and Cambridge with modern powerhouses such as Imperial, UCL, and Edinburgh. Most master's programs finish in one year, saving a full year of tuition and living costs compared to other countries.

The Graduate Route lets international students stay and work for two years after their degree (three for PhD graduates). London is expensive, but cities like Manchester, Glasgow, Birmingham, and Leeds offer the same degree quality at far lower living costs.

British degrees carry strong global recognition, and the short program lengths make the UK one of the fastest routes from classroom to career.`,
  },
  {
    name: "Australia",
    slug: "australia",
    shortDescription: "Sun, beaches, and Group of Eight universities with generous post-study work visas.",
    description: `Australia's Group of Eight — including Melbourne, Sydney, ANU, and Queensland — ranks among the world's best. Popular fields include engineering, IT, nursing, and business, all aligned with the skilled occupation lists.

Post-study work visas run from two to four years depending on your qualification and location, and regional campuses offer bonus points toward permanent residency. Part-time work rights during semesters help cover the high living costs of Sydney and Melbourne.

Expect an outdoor lifestyle, multicultural cities, and a straightforward, points-based migration system for graduates.`,
  },
  {
    name: "Germany",
    slug: "germany",
    shortDescription: "Near-zero tuition at public universities, even for international students.",
    description: `Germany's public universities charge little to no tuition — even for non-EU students — with only a small semester contribution. TU Munich, Heidelberg, RWTH Aachen, and hundreds more offer world-class engineering, sciences, and humanities.

An ever-growing number of programs are taught fully in English, especially at master's level. You will need a blocked account (Sperrkonto) for the student visa to prove living expenses, roughly €11,000+ per year.

After graduation, an 18-month job-search residence permit and the EU Blue Card route make Germany one of Europe's best launchpads for an international career. Learning basic German multiplies your options.`,
  },
  {
    name: "France",
    slug: "france",
    shortDescription: "Grandes écoles, fashion, and low public-university fees in Europe's cultural capital.",
    description: `France offers elite grandes écoles for business and engineering alongside affordable public universities. Tuition at public institutions stays low by international standards, and Paris hosts campuses of world-famous schools like HEC, ESSEC, and Sciences Po.

Master's graduates can apply for a one-year job-search residence permit (APS), renewable once. French language skills dramatically improve both admission odds and job prospects, though many business and tech master's run in English.

Beyond academics: subsidized student housing (CAF), cheap canteens (CROUS), and a student lifestyle built around art, food, and travel across Europe.`,
  },
  {
    name: "Netherlands",
    slug: "netherlands",
    shortDescription: "The largest English-taught course catalog in continental Europe.",
    description: `The Dutch teach more programs in English than any other non-Anglophone country. Delft, Amsterdam, Utrecht, and Eindhoven excel in engineering, computer science, business, and social sciences.

Tuition for non-EU students is moderate, and the one-year orientation visa (zoekjaar) lets graduates stay to find work. The Netherlands hosts European HQs of countless multinationals, so internships often convert to jobs.

Compact, bike-friendly cities, near-universal English fluency, and direct train links to the rest of Europe make daily life easy from day one.`,
  },
  {
    name: "Ireland",
    slug: "ireland",
    shortDescription: "Europe's English-speaking tech hub, home to Google, Apple, and Pfizer HQs.",
    description: `Ireland pairs an English-speaking environment with the European headquarters of the world's biggest tech and pharma companies. Trinity College Dublin, UCD, and strong institutes of technology feed directly into these employers.

The Third Level Graduate Scheme gives one to two years of post-study work rights. Dublin rents are steep, so many students choose Cork, Galway, or Limerick for the same degrees at lower cost.

Ireland suits students targeting careers in software, data, pharmaceuticals, and finance who want EU access with no language barrier.`,
  },
  {
    name: "New Zealand",
    slug: "new-zealand",
    shortDescription: "Safe, scenic, and student-friendly, with all eight universities globally ranked.",
    description: `All eight New Zealand universities appear in global rankings, led by Auckland and Otago. Class sizes are small, teaching is practical, and campuses sit minutes from beaches, mountains, and lakes.

Post-study work visas of up to three years reward higher qualifications, and the Green List fast-tracks residence for in-demand professions like teaching, nursing, and engineering.

It is a smaller, calmer alternative to Australia: same English-speaking quality, lower costs, and arguably the friendliest student welcome in the world.`,
  },
  {
    name: "Japan",
    slug: "japan",
    shortDescription: "Cutting-edge research, generous MEXT scholarships, and unmatched safety.",
    description: `Japan blends top research universities (Tokyo, Kyoto, Osaka, Tohoku) with growing English-taught programs. The MEXT government scholarship can cover tuition, flights, and a monthly stipend — one of the world's most generous packages.

Living costs are manageable outside central Tokyo, and the part-time work system (28 hours/week with permission) is well organized. Japanese language ability unlocks far more programs and jobs, so most students combine study with language school first.

Expect exceptional safety, punctuality, and infrastructure — plus a job market hungry for bilingual international graduates.`,
  },
  {
    name: "South Korea",
    slug: "south-korea",
    shortDescription: "SKY universities, K-culture energy, and heavy scholarships for internationals.",
    description: `Seoul National, Korea University, and Yonsei (the "SKY" trio) anchor a fast-rising higher education scene, especially strong in engineering, business, and media. KAIST rivals the world's best tech institutes.

Korean universities discount tuition aggressively for international students — 30–100% scholarships are common for strong profiles. Government programs like GKS cover full costs for selected scholars.

Seoul's pace, food, and pop culture need no introduction. Post-study job hunting favors Korean speakers, and TOPIK certification is the single highest-ROI investment you can make.`,
  },
  {
    name: "Sweden",
    slug: "sweden",
    shortDescription: "Innovation-first education: flat hierarchies, group work, and sustainability focus.",
    description: `Sweden's universities — Lund, KTH, Uppsala, Chalmers — teach through collaboration rather than hierarchy, mirroring the country's famous work culture. English-taught master's programs are extensive.

Non-EU tuition applies, but numerous scholarships (including the Swedish Institute award) cover it fully. Graduates get six months to seek work or start a company, and Sweden's startup scene punches far above its size.

Dark winters are real, but so are the northern lights, fika breaks, and a society engineered around work-life balance.`,
  },
  {
    name: "Finland",
    slug: "finland",
    shortDescription: "The world's most educated nation, with a two-year post-study residence for graduates.",
    description: `Finland tops global education rankings, and its universities (Helsinki, Aalto, Tampere) extend that quality to higher degrees. Doctoral education remains free even for non-EU students.

Master's graduates can now stay two years to seek work — among Europe's most generous windows. Scholarships from universities and the EDUFI fellowship ease the tuition for bachelor's and master's students.

Expect pristine nature, saunas everywhere, honest pricing, and a society where students are genuinely trusted and supported.`,
  },
  {
    name: "Denmark",
    slug: "denmark",
    shortDescription: "Problem-based learning in one of the world's happiest countries.",
    description: `Danish universities like Copenhagen, DTU, and Aarhus teach through real-world projects with companies from day one. Non-EU tuition exists but stays moderate, with government and university scholarships available.

Graduates receive up to three years to establish a career in Denmark under the job-seeking scheme. Copenhagen's salaries are high, though so are rents — budget carefully.

Denmark fits independent learners who want industry-linked education and a shot at one of Europe's highest quality-of-life societies.`,
  },
  {
    name: "Norway",
    slug: "norway",
    shortDescription: "No tuition fees at public universities — fjords included free of charge.",
    description: `Norway charges no tuition at public universities for any nationality — you pay only living costs, which are admittedly steep. Oslo, Bergen, NTNU Trondheim, and Tromsø offer strong programs, many in English at master's level.

You must document roughly NOK 150,000+ per year for the study permit. Part-time work is permitted, and skilled graduates find a small but wealthy job market, especially in energy, maritime, and tech.

If you can fund living costs, Norway is the cheapest elite education on Earth — academically and scenically spectacular.`,
  },
  {
    name: "Italy",
    slug: "italy",
    shortDescription: "Politecnico di Milano, Bocconi, and la dolce vita on a student budget.",
    description: `Italy combines historic universities (Bologna — the oldest in the Western world) with modern leaders like Politecnico di Milano and Bocconi. Tuition at public universities is income-based and often under €3,000/year, with regional scholarships covering housing and meals.

Many master's programs run in English, particularly in engineering, design, economics, and data science. Graduates get up to a year to find work, convertible to a work permit.

Milan drives careers; smaller cities like Bologna, Padua, and Turin deliver the classic Italian student life at half the cost.`,
  },
  {
    name: "Spain",
    slug: "spain",
    shortDescription: "Sunny campuses, low fees, and business schools ranked among Europe's best.",
    description: `Spain's public universities charge some of Europe's lowest fees, while private icons like IE, ESADE, and IESE dominate business rankings. Barcelona and Madrid buzz with startups; Valencia and Granada offer beachside study at student prices.

A growing English-taught catalog covers business, tourism, and tech. Non-EU graduates can switch to a one-year job-search residence and then to employer-sponsored permits.

Spanish opens all of Latin America too — a language ROI few destinations can match, wrapped in unbeatable food and weather.`,
  },
  {
    name: "Switzerland",
    slug: "switzerland",
    shortDescription: "ETH Zurich and EPFL: two of the planet's top ten tech universities.",
    description: `ETH Zurich and EPFL Lausanne consistently rank in the global top ten, with semester fees around CHF 700 — astonishing value for that caliber. Hospitality schools (EHL, Glion, Les Roches) are the world's finest.

Admission is fiercely competitive and living costs are the world's highest — budget CHF 2,000+/month. But graduate salaries match: Swiss starting pay leads Europe by a wide margin.

Switzerland suits elite STEM and hospitality students with the profile to get in and the funds to live while studying.`,
  },
  {
    name: "Austria",
    slug: "austria",
    shortDescription: "Vienna's music, low tuition, and central-European affordability.",
    description: `Austria's public universities charge minimal tuition (around €750/semester for non-EU students), with the University of Vienna, TU Wien, and WU among the respected names. Vienna regularly tops "most livable city" rankings while staying cheaper than Zurich or Munich.

Many master's programs run in English, and the Red-White-Red Card gives graduates a full year to find qualifying work. German helps enormously outside international firms.

Expect imperial architecture, coffee-house study culture, and ski slopes an hour from lecture halls.`,
  },
  {
    name: "Malaysia",
    slug: "malaysia",
    shortDescription: "British and Australian degrees at a third of the price, in tropical Kuala Lumpur.",
    description: `Malaysia hosts branch campuses of top UK and Australian universities — Nottingham, Monash, Southampton — awarding identical degrees for a fraction of the home-campus cost. Local leaders like Universiti Malaya also rank well globally.

Tuition plus living often totals less than tuition alone elsewhere, and the Graduate Pass lets new degree-holders stay a year to job-hunt. English is widely spoken; costs stay low without sacrificing campus quality.

Ideal for budget-conscious students who refuse to compromise on degree recognition across Asia and the Commonwealth.`,
  },
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();
  if (!uri || !dbName) {
    console.error("seed-countries: MONGODB_URI and MONGODB_DB must be set.");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 15000 });

  try {
    const existing = new Set<string>(
      (await Country.find({}).select("slug").lean().exec()).map((d) => d.slug)
    );

    let created = 0;
    let skipped = 0;
    for (const seed of COUNTRIES) {
      if (existing.has(seed.slug)) {
        skipped++;
        continue;
      }
      const validation = validateCountryInput(
        {
          name: seed.name,
          slug: seed.slug,
          shortDescription: seed.shortDescription,
          description: seed.description,
          metaTitle: `Study in ${seed.name} — Universities, Costs & Visas`,
          metaDescription: seed.shortDescription,
          isPublished: true,
        },
        false
      );
      if (!validation.ok) {
        console.error(`seed-countries: invalid ${seed.slug}: ${validation.errors.join("; ")}`);
        continue;
      }
      await Country.create({
        ...validation.data,
        isPublished: true,
      });
      created++;
    }

    await Country.createIndexes();
    console.log(`seed-countries: created=${created} skipped=${skipped} total=${COUNTRIES.length}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(
    `seed-countries: ${message.replace(/mongodb(\+srv)?:\/\/[^/\s]+/i, "<redacted-uri>").slice(0, 300)}`
  );
  process.exit(1);
});
