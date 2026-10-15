import "server-only";

import mongoose from "mongoose";
import { getMongoEnv } from "@/lib/env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

function getCache(): MongooseCache {
  if (!globalThis.__mongooseCache) {
    globalThis.__mongooseCache = { conn: null, promise: null };
  }
  return globalThis.__mongooseCache;
}

/**
 * Reusable MongoDB connection via Mongoose.
 * Reuses the same connection across requests and hot reloads.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const cache = getCache();
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const { uri, dbName } = getMongoEnv();
    cache.promise = mongoose.connect(uri, {
      dbName,
      // Fail fast for health checks instead of hanging.
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * Lightweight ping against the connected database.
 * Throws on failure; callers must map to non-sensitive HTTP errors.
 */
export async function pingDatabase(): Promise<{ ok: true }> {
  const connection = await connectToDatabase();
  const admin = connection.connection.db?.admin();
  if (!admin) {
    throw new Error("Database handle is not available after connect.");
  }
  await admin.ping();
  return { ok: true };
}
