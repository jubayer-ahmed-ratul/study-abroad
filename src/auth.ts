import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getAuthEnv } from "@/lib/env";
import { connectToDatabase } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { timingSafeCompare, verifyPassword } from "@/lib/password";
import { ADMIN_ROLE, Admin, normalizeEmail } from "@/models/Admin";

class InvalidLogin extends CredentialsSignin {
  code = "invalid-credentials";
}

function requestIp(request: Request): string {
  // Best-effort only; not trusted for security decisions. See README limits.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || "unknown";
}

function isValidLoginInput(email: unknown, password: unknown): boolean {
  return (
    typeof email === "string" &&
    typeof password === "string" &&
    email.trim().length >= 3 &&
    email.trim().length <= 254 &&
    password.length >= 1 &&
    password.length <= 256
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  // Lazy validation with a clear error instead of an obscure library failure.
  getAuthEnv();

  return {
    // JWT strategy: no per-request DB hit for session reads. Admin layout and
    // sensitive APIs re-validate active status from MongoDB on each request,
    // so deactivation takes effect promptly.
    session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
    // Required so Auth.js accepts the request host (dev ports, proxies,
    // deployed domains). Safe here because this app uses Credentials-only
    // sign-in: there are no OAuth redirect URLs for a forged Host header to
    // steal. If OAuth providers are added later, set AUTH_URL explicitly and
    // re-evaluate this flag.
    trustHost: true,
    pages: { signIn: "/admin/login" },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials, request) {
          const rawEmail = credentials?.email;
          const rawPassword = credentials?.password;
          if (!isValidLoginInput(rawEmail, rawPassword)) {
            throw new InvalidLogin();
          }
          const email = normalizeEmail(rawEmail as string);
          const password = rawPassword as string;

          // Abuse prevention (single-process in-memory; see README).
          const ip = requestIp(request);
          const emailLimit = checkRateLimit(`login:email:${email}`, 10, 10 * 60_000);
          const ipLimit = checkRateLimit(`login:ip:${ip}`, 30, 10 * 60_000);
          if (!emailLimit.allowed || !ipLimit.allowed) {
            throw new InvalidLogin();
          }

          await connectToDatabase();
          const admin = await Admin.findOne({ email }).select("+passwordHash").exec();

          if (!admin || !admin.isActive || admin.role !== ADMIN_ROLE) {
            // Equalize timing; identical generic failure (no existence leak).
            await timingSafeCompare(password);
            throw new InvalidLogin();
          }

          const ok = await verifyPassword(password, admin.passwordHash);
          if (!ok) {
            throw new InvalidLogin();
          }

          return {
            id: String(admin._id),
            name: admin.name,
            email: admin.email,
            role: admin.role,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.adminId = user.id;
          token.role = (user as { role?: string }).role;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = (token.adminId as string) ?? token.sub ?? "";
          session.user.role = (token.role as string) ?? ADMIN_ROLE;
        }
        return session;
      },
    },
  };
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    adminId?: string;
    role?: string;
  }
}
