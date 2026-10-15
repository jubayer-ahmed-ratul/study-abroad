import "server-only";

export interface MongoEnv {
  uri: string;
  dbName: string;
}

export interface CloudinaryEnv {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isMongoConfigured(): boolean {
  return readEnv("MONGODB_URI") !== undefined && readEnv("MONGODB_DB") !== undefined;
}

export function isCloudinaryConfigured(): boolean {
  return (
    readEnv("CLOUDINARY_CLOUD_NAME") !== undefined &&
    readEnv("CLOUDINARY_API_KEY") !== undefined &&
    readEnv("CLOUDINARY_API_SECRET") !== undefined
  );
}

/**
 * Validate MongoDB env vars when the integration is initialized.
 * Throws a non-sensitive error if misconfigured.
 */
export function getMongoEnv(): MongoEnv {
  const uri = readEnv("MONGODB_URI");
  const dbName = readEnv("MONGODB_DB");

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. See .env.example and README for MongoDB Atlas setup."
    );
  }
  if (!dbName) {
    throw new Error(
      "MONGODB_DB is not set. See .env.example and README for MongoDB Atlas setup."
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGODB_URI looks invalid. Expected to start with mongodb:// or mongodb+srv://.");
  }

  return { uri, dbName };
}

/**
 * Validate Cloudinary env vars when the integration is initialized.
 * Never expose values in errors.
 */export function getCloudinaryEnv(): CloudinaryEnv {
  const cloudName = readEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = readEnv("CLOUDINARY_API_KEY");
  const apiSecret = readEnv("CLOUDINARY_API_SECRET");

  const missing: string[] = [];
  if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudinary configuration: ${missing.join(", ")}. See .env.example and README.`
    );
  }

  return {
    cloudName: cloudName as string,
    apiKey: apiKey as string,
    apiSecret: apiSecret as string,
  };
}

export function isAuthConfigured(): boolean {
  return readEnv("AUTH_SECRET") !== undefined;
}

/**
 * Validate auth env vars when the auth integration is initialized.
 * Never include secret values in errors.
 */
export function getAuthEnv(): { secret: string } {
  const secret = readEnv("AUTH_SECRET");
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one (see README) and add it to .env.local."
    );
  }
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }
  return { secret };
}
