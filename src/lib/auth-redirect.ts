/** Client-safe helper: allow only trusted internal destinations. */
export function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  try {
    const decoded = decodeURIComponent(raw);
    // Must be an absolute path on this origin: single leading slash,
    // no protocol, no backslashes, no control chars.
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      decoded.includes(":") ||
      /[\s<>]/.test(decoded)
    ) {
      return "/admin";
    }
    return decoded;
  } catch {
    return "/admin";
  }
}
