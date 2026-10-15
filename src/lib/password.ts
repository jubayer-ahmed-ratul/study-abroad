import "server-only";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password with bcrypt (cost 12).
 * Never log or return the plaintext.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/** Compare a plaintext candidate against a stored bcrypt hash. */
export async function verifyPassword(
  plaintext: string,
  passwordHash: string
): Promise<boolean> {
  if (!plaintext || !passwordHash) return false;
  try {
    return await bcrypt.compare(plaintext, passwordHash);
  } catch {
    return false;
  }
}

/**
 * Real bcrypt hash of a never-used dummy value, used only to equalize timing
 * when the account does not exist or is inactive. Not a credential.
 */
const DUMMY_HASH = "$2b$12$EFAXcDMFFmXiNLfhVUgcmeTTZOiwW7KQVIoAOF4OVbnEgfzy6lAe2";

export async function timingSafeCompare(plaintext: string): Promise<void> {
  try {
    await bcrypt.compare(plaintext, DUMMY_HASH);
  } catch {
    // Intentionally ignored — only burns comparable time.
  }
}
