# Architecture

The canonical application and API decision is
[Website ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md).
The detailed repository contract lives in
[the local authentication and BFF architecture](docs/authentication-and-bff.md).

## Application Shape

The application uses the Next.js App Router and React Server Components by default. The protected root page remains a
server boundary; its fixture-backed app controller is a client component because navigation and dialogs are
intentionally local UI state.

Atomic Design defines the UI boundary:

- Atoms are visual primitives.
- Molecules compose atoms without route or data ownership.
- Organisms assemble product surfaces.
- Templates own layout.
- Route files own page composition and server-side access decisions.

The application is a Backend for Frontend (BFF). React Server Components read through a server-only Payload access
layer. Browser-initiated reads and mutations use capability-specific Route Handlers on this application's origin.
Server Components call the access layer directly rather than making internal HTTP requests to those handlers. No route
acts as a generic Payload proxy.

## Current Access Boundary

The unauthenticated surface exposes only `/login`, `/api/auth/login`, `/api/health`, and `/robots.txt`. The data-less dashboard route `/` uses a temporary server-side password guard, and all application responses emit `noindex` headers. Vercel Deployment Protection remains a separate optional layer and is currently disabled.

The approved runtime boundary replaces the temporary password guard in a later implementation. Supabase will own the
user session in secure, host-bound, `HttpOnly` cookies. Login, PKCE callback, refresh, and logout will run through the
Dashboard BFF. Browser application code will receive no token, create no Supabase browser client, and make no request to
Payload.

Payload remains the current authorization boundary. The Dashboard server sends the user's access token to Payload as a
Bearer token; Payload resolves current `clinicStaff` approval, clinic assignment, and permissions for every request.
Authorization is enforced at the Payload data boundary, not only in Next.js proxy or Route Handler logic.

Authenticated state-changing Route Handlers use one central mutation guard. It validates the exact origin and a
stateless HMAC-signed CSRF token bound to the current Supabase session. Staging and Production store the CSRF token in a
host-only `__Host-` cookie. Payload requires no CSRF-specific change.

## Data Boundary

The app shell has no persistence and no clinic data. Its presentation content is deterministic fixture data, and its
complete visual reference is isolated in Storybook. Payload remains the source of truth and the only application with
database access. The Clinic Dashboard receives no direct database access, no Supabase service-role key, and no durable
business cache.

The Dashboard server uses Payload REST resources and focused custom endpoints with typed DTOs. A self-and-capability
bootstrap returns only the current principal, clinic, approval state, and allowed capabilities required by the UI. The
Dashboard never treats request-provided clinic, role, or actor data as authoritative.

## Environment Boundary

Local development and pull-request previews use Supabase Staging and the website Preview API. Production uses the
production Supabase project and production Payload API. The existing Vercel preview URLs remain unchanged; Supabase
Staging uses a project-specific wildcard restricted to `/auth/callback`, while production allows only
`https://clinics.findmydoc.eu/auth/callback`.

The Payload client accepts exactly `https://preview.findmydoc.eu` in Local and Preview and exactly
`https://findmydoc.eu` in Production. It requires HTTPS and treats redirects as errors so an authenticated request never
replays its Bearer token to another origin.

Callback origins come from validated environment configuration or trusted Vercel metadata, not an unchecked `Host`
header. Post-authentication destinations are validated relative Dashboard paths.

## Cache Boundary

Authentication, session, principal, clinic, capability, and authenticated Dashboard reads are private live data. BFF
responses use private, no-store semantics. ISR, public shared caches, durable Dashboard caches, and Vercel Data Cache
entries are excluded. Request-local deduplication is allowed.

Authorized Payload mutations can still change data rendered on the public website. Those writes retain the existing
website revalidation contract for affected public surfaces; the private BFF response neither replaces nor suppresses
that invalidation.

## Prototype Visibility Boundary

The app exposes only `visual-reference` and `presentation` variants. `/` always renders `presentation`; Storybook renders
both. Visibility configuration is not authorization, has no user-facing toggle, and must be removed gate by gate when a
server-authorized capability replaces it.

## Delivery Boundary

GitHub Actions owns validation and Vercel deployments. Pull-request checks are advisory on the current GitHub plan. Preview deployment is enabled; production deployment is guarded by an explicit repository variable that defaults to disabled.
