import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight UX redirect only — NOT the security boundary.
 * Checks for the presence (not validity) of the Auth.js session cookie so
 * unauthenticated browsers get a fast redirect to login. Forged or expired
 * cookies are rejected by the server-side checks in `src/app/admin/layout.tsx`
 * and protected APIs, which verify the signed session on every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasSession =
      request.cookies.has("authjs.session-token") ||
      request.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", request.url);
      const returnTo = pathname + search;
      if (returnTo !== "/admin" && returnTo.startsWith("/admin")) {
        loginUrl.searchParams.set("callbackUrl", returnTo);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
