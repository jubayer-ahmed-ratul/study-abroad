/**
 * Create the initial administrator account.
 *
 * Usage (prefer env vars so the password never appears in process lists):
 *
 *   $env:ADMIN_NAME="Site Admin"; $env:ADMIN_EMAIL="admin@example.com"; $env:ADMIN_PASSWORD="..."
 *   npm run create-admin
 *
 * Or with CLI flags (password visible to local process listing — dev only):
 *
 *   npm run create-admin -- --name "Site Admin" --email admin@example.com --password "..."
 *
 * The script exits safely without modifying anything if the account already
 * exists. It never runs automatically on app startup.
 */
import dotenv from "dotenv";

// Load local dev secrets (.env.local is git-ignored; never commit it).
dotenv.config({ path: ".env.local" });
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function fail(message: string): never {
  console.error(`create-admin: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const name = (readFlag("name") ?? process.env.ADMIN_NAME ?? "").trim();
  const rawEmail = (readFlag("email") ?? process.env.ADMIN_EMAIL ?? "").trim();
  const password = readFlag("password") ?? process.env.ADMIN_PASSWORD ?? "";

  if (name.length < 2 || name.length > 100) {
    fail("Provide --name (or ADMIN_NAME) with 2–100 characters.");
  }
  const email = rawEmail.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    fail("Provide --email (or ADMIN_EMAIL) with a valid email address.");
  }
  if (password.length < 12 || password.length > 256) {
    fail("Provide --password (or ADMIN_PASSWORD) with 12–256 characters.");
  }

  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();
  if (!uri || !dbName) {
    fail("MONGODB_URI and MONGODB_DB must be set (see .env.local).");
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });

  try {
    const admins = mongoose.connection.db?.collection("admins");
    if (!admins) fail("Database handle unavailable after connect.");

    const existing = await admins.findOne({ email });
    if (existing) {
      console.log(`create-admin: admin ${email} already exists — not modifying.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await admins.insertOne({
      name,
      email,
      passwordHash,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Ensure the unique email index exists for future writes.
    await admins.createIndex({ email: 1 }, { unique: true });

    console.log(`create-admin: admin ${email} created.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  fail(message.replace(/mongodb(\+srv)?:\/\/[^/\s]+/i, "<redacted-uri>").slice(0, 300));
});
