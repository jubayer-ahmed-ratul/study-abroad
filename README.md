# Study Abroad Platform — Phase 0 Foundation + Phase 1 Auth

Next.js App Router + TypeScript (strict) + Tailwind CSS + ESLint + Mongoose + Cloudinary + Auth.js.

Phase 0 covers **only** the technical foundation: project setup, MongoDB Atlas
connection reuse, Cloudinary server-only configuration, env validation, and
temporary diagnostic health endpoints.

Phase 1 adds **authentication and secure admin access only**: admin login page,
Auth.js Credentials sessions, Admin model, CLI bootstrap, protected `/admin`
area with dashboard placeholder, logout, and login rate limiting. No country /
university CRUD, public pages, or student registration.

## Prerequisites

- Node.js 20+ (tested on Node 24)
- npm 10+
- Git
- MongoDB Atlas account + cluster (for live DB check)
- Cloudinary account (for live media config check)

## Installation

```bash
npm install
cp .env.example .env.local
# edit .env.local with real values (see below)
npm run dev
```

App: http://localhost:3000

## Environment variable setup

1. Copy the template:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in `.env.local` (never commit this file):

   | Variable | Required for | Where to obtain |
   | --- | --- | --- |
   | `MONGODB_URI` | `src/lib/mongodb.ts`, `/api/health/database` | MongoDB Atlas → Database → Connect → Drivers → Node.js. Format: `mongodb+srv://<user>:<pass>@<cluster-host>/...` |
   | `MONGODB_DB` | Mongoose `dbName` | Your database name, e.g. `study_abroad` |
   | `CLOUDINARY_CLOUD_NAME` | `src/lib/cloudinary.ts`, `/api/health/cloudinary` | Cloudinary Console → Dashboard |
   | `CLOUDINARY_API_KEY` | Cloudinary server client | Cloudinary Console → Dashboard |
   | `CLOUDINARY_API_SECRET` | Cloudinary server client (server-only) | Cloudinary Console → Dashboard → reveal secret |
   | `AUTH_SECRET` | Auth.js session encryption (server-only, Phase 1) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

3. `.env.local` and other `.env*` secrets are excluded via `.gitignore`
   (only `.env.example` is committed).

4. Validation is lazy per integration:
   - `getMongoEnv()` throws only when MongoDB is initialized.
   - `getCloudinaryEnv()` throws only when Cloudinary is initialized.
   - Missing unrelated vars do not break other dev tasks.

5. Never use `NEXT_PUBLIC_` for `MONGODB_URI`, `MONGODB_DB`,
   `CLOUDINARY_API_SECRET`, or `CLOUDINARY_API_KEY`. Secrets stay server-only
   via `import "server-only"` in `src/lib/*`.

## MongoDB Atlas configuration

1. Create cluster at https://cloud.mongodb.com.
2. Database Access → add user + password.
3. Network Access → allow your IP (or `0.0.0.0/0` for dev only).
4. Database → Connect → Drivers → copy Node.js URI into `MONGODB_URI`.
5. Set `MONGODB_DB` (e.g. `study_abroad`). No collections/schemas are created
   in Phase 0.

Implementation:

- `src/lib/env.ts` — lazy `getMongoEnv()` validation.
- `src/lib/mongodb.ts` — Mongoose `connectToDatabase()` with
  `globalThis` cache for request + hot-reload reuse, plus `pingDatabase()`
  using `db.admin().ping()`.

## Cloudinary configuration

1. Sign up at https://cloudinary.com, open https://console.cloudinary.com/dashboard.
2. Copy Cloud name, API key, API secret into `.env.local`.
3. No upload/delete/transformation code in Phase 0.

Implementation:

- `src/lib/cloudinary.ts` — server-only `getCloudinaryClient()` using the
  official `cloudinary` v2 SDK (`cloudinary.config(...)`), plus
  `pingCloudinary()` via `client.api.ping()`.
- If the key lacks account-API permission, the health endpoint reports
  `misconfigured: ... lack ping permission` rather than `invalid credentials`.

## Phase 1 — Authentication & secure admin access

Stack: **Auth.js v5** (`next-auth@5` beta, Credentials provider, JWT
strategy) + **bcryptjs** (cost 12) + existing Mongoose connection cache.
Chosen because Auth.js manages HTTP-only cookies, CSRF, and session
encryption; JWT avoids a DB hit per session read. Pinned to the v5 beta line
because it is the App Router-native release (v4 targets older Next.js).

### Architecture

- `src/auth.ts` — NextAuth config (server-only): Credentials `authorize()`
  validates input, rate-limits, finds the admin by normalized email, verifies
  bcrypt (with dummy-hash timing equalization for unknown/inactive accounts),
  rejects inactive admins. JWT carries `adminId` + `role`; session exposes
  `user.id` + `user.role`. Cookies are HTTP-only, `Secure` in production,
  `SameSite=Lax` (library defaults).
- `src/models/Admin.ts` — `name`, normalized unique `email`, `passwordHash`
  (`select: false`), explicit `role: "admin"`, `isActive`, timestamps.
- `src/lib/admin-session.ts` — server authority: verifies the signed session
  **and** re-checks `isActive`/`role` in MongoDB on every call.
- `src/proxy.ts` — UX-only fast redirect to `/admin/login` when no session
  cookie is present. **Not** the security boundary; forged cookies fail the
  server checks.
- Login page `src/app/(auth)/admin/login/page.tsx` (static shell) + `LoginForm`
  (client, `signIn("credentials")`; redirects to the dashboard when already
  signed in). Server-side `redirect()` is deliberately avoided here: under
  production prerendering it can resolve after streaming starts and surface as
  an error boundary instead of a 307.
- Protected `/admin` layout (server check, redirects to login) with dashboard
  placeholder; `/api/admin/me` returns the safe admin or 401/403 JSON
  (never redirects, never includes `passwordHash`).
- Logout via Auth.js `signOut()` (library invalidates the session cookie),
  redirecting to `/admin/login`. No custom logout endpoint.

### Create the initial administrator

One-time, explicit, never automatic:

```bash
# Preferred: env vars (password stays out of process lists)
$env:ADMIN_NAME="Site Admin"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="<12+ characters>"
npm run create-admin
```

Existing email → script exits safely without changing anything. No default
passwords are seeded anywhere.

### Test login and logout

```bash
npm run dev
# open http://localhost:3000/admin/login
```

- Invalid credentials → generic "Invalid email or password." (no existence leak).
- Valid credentials → redirect to `/admin` dashboard.
- `/admin` without a session → redirect to `/admin/login`.
- `GET /api/admin/me` without a session → `401`; inactive admin → `403`.
- Dashboard "Sign out" → back to `/admin/login`, session ended.
- `callbackUrl` values are sanitized to same-origin `/admin...` paths only.

### Rate limiting (and its limits)

- Login: 10 attempts / 10 min per normalized email, 30 / 10 min per IP
  (best-effort IP from `x-forwarded-for`), reused in-memory limiter.
- Health endpoints: 10 req / min / IP (unchanged from Phase 0).
- The limiter is **single-process in-memory**: correct for one dev server,
  not distributed-safe across serverless instances. Production upgrade path:
  Redis/Upstash-backed limiter (e.g. `@upstash/ratelimit`) behind the same
  `checkRateLimit` interface; do not claim current limits hold across replicas.

### Deployment considerations

- Set `AUTH_SECRET` (≥32 chars), `MONGODB_URI`, `MONGODB_DB` in the host env.
  `AUTH_URL` is only needed if Auth.js cannot infer the canonical URL.
- `trustHost: true` is set in `src/auth.ts` so Auth.js accepts dev ports,
  proxies, and deployed domains. Safe with the current Credentials-only setup
  (no OAuth redirect URLs to steal via a forged Host header); re-evaluate if
  OAuth providers are ever added.
- Delete or auth-protect `/api/health/*` before public launch (see Phase 0 notes).
- Rotate `AUTH_SECRET` to invalidate all sessions if it ever leaks.

## Development commands

```bash
npm run dev     # dev server
npm run build   # production build
npm start       # serve production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck
```

## Verification commands

```bash
npm install
npx tsc --noEmit
npm run lint
npm run build
```

Live checks (require real `.env.local`):

```bash
# dev server in one terminal:
npm run dev
# then:
curl http://localhost:3000/api/health/database
curl http://localhost:3000/api/health/cloudinary
```

Expected without credentials: HTTP `503` +
`{"status":"misconfigured",...}` — this is correct, not a bug.

Expected with valid credentials: HTTP `200` + `{"status":"ok",...}`.

No fake success: endpoints run a real `ping`; they never return `ok`
without reaching the service.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `/api/health/database` → `misconfigured` | `MONGODB_URI`/`MONGODB_DB` missing in `.env.local`; restart `next dev` after editing env |
| `Database unreachable` (503) | IP not allow-listed, wrong password, cluster paused; check Atlas Network Access + user |
| `serverSelectionTimeout` | Network/firewall; default timeout 8s for fast health checks |
| `/api/health/cloudinary` → `invalid credentials` | Wrong cloud name/key/secret; re-copy from dashboard |
| `lack ping permission` | Key is valid but restricted; create an unrestricted API key or check Account API permissions |
| `429 Too many requests` | In-memory rate limit (10 req/min/IP on health endpoints); wait a minute |
| `server-only` import error in client component | `src/lib/*` is server-only by design; do not import from `"use client"` components |

## Security notes for diagnostic endpoints

Temporary endpoints:

- `GET /api/health/database` — real MongoDB ping, no URI/credentials/stack in response.
- `GET /api/health/cloudinary` — real `api.ping()`, no secrets in response.
- Route handlers are dynamic by default (Next 15+); no `dynamic`/`runtime`
  segment configs are used to stay compatible with `cacheComponents`.

Protections:

- Dynamic route handlers (default in Next 15+, compatible with `cacheComponents`).
- Basic in-memory fixed-window rate limiting (10/min/IP). This is **not**
  distributed-safe.
- Server-side failures are logged without sensitive data; clients get generic
  `Database unreachable` / `Cloudinary unreachable`.

Before production launch, either:

1. Delete `src/app/api/health/**/route.ts`, or
2. Protect with auth (e.g. admin session, secret header, IP allow-list) and
   replace in-memory limiting with Redis/Upstash or gateway rate limiting,
   and restrict response detail.

## Project structure (Phase 0 + Phase 1)

```text
src/
  app/
    (auth)/admin/login/page.tsx   # login page (server, redirects when signed in)
    admin/layout.tsx               # protected shell (server check)
    admin/page.tsx                 # dashboard placeholder
    api/
      auth/[...nextauth]/route.ts  # Auth.js handlers
      admin/me/route.ts            # protected API (401/403 JSON)
      health/database/route.ts
      health/cloudinary/route.ts
  auth.ts                          # NextAuth v5 config (server-only)
  components/admin/
    LoginForm.tsx                  # client login form
    LogoutButton.tsx               # client sign-out
  lib/
    env.ts                         # lazy validated env (server-only)
    mongodb.ts                     # Mongoose connection reuse + ping
    cloudinary.ts                  # Cloudinary v2 config + ping
    rate-limit.ts                  # in-memory limiter (dev/single-process)
    password.ts                    # bcryptjs hash/verify (server-only)
    admin-session.ts               # session + DB re-validation (server-only)
    auth-redirect.ts               # callbackUrl sanitizer (client-safe)
  models/
    Admin.ts                       # Admin model, unique normalized email
  types/
    health.ts
  proxy.ts                         # UX-only /admin redirect (not the boundary)
scripts/
  create-admin.ts                  # one-time admin bootstrap (tsx)
.env.example
README.md
```
