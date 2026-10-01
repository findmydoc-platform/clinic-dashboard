# Architecture

For the cross-application boundary, start with the [shared platform architecture](https://github.com/findmydoc-platform/platform-architecture) when access is available. If access is unavailable, use this local guide and state that the shared view could not be checked. This file describes Dashboard-owned implementation; see the [capability status](docs/authentication-and-bff.md#runtime-status-and-scope) for the distinction between code wiring and rollout evidence.

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

The unauthenticated route set is defined by [`src/lib/security/public-routes.ts`](src/lib/security/public-routes.ts). The protected dashboard route `/` uses the implemented server-side Supabase session and Payload bootstrap, rather than the former temporary password guard. Session cookies are host-bound and `HttpOnly`; login, callback confirmation, refresh, and logout run through the Dashboard BFF. Browser application code receives no token, creates no Supabase browser client, and makes no request to Payload. The application disables indexing. These code facts do not establish Preview or Production auth-flow verification.

Payload remains the current authorization boundary. The Dashboard server sends the user's access token to Payload as a
Bearer token; Payload resolves current `clinicStaff` approval, clinic assignment, and permissions for every request.
Authorization is enforced at the Payload data boundary, not only in Next.js proxy or Route Handler logic.

Authenticated state-changing Route Handlers use one central mutation guard. It validates the exact origin and a
stateless HMAC-signed CSRF token bound to the current Supabase session. Staging and Production store the CSRF token in a
host-only `__Host-` cookie. Payload requires no CSRF-specific change.

## Data Boundary

The Dashboard has no business-data persistence. Its demo workspace still provides deterministic presentation content,
while the server composition overlays source-backed domain results in normal mode. Storybook keeps the visual reference.
Payload remains the source of truth and the only application with database access. The Clinic Dashboard receives no
direct database access, no Supabase service-role key, and no durable business cache.

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

GitHub Actions owns validation and Vercel delivery. [Setup guidance](docs/SETUP.md) records the deployment configuration; the [capability status](docs/authentication-and-bff.md#runtime-status-and-scope) keeps per-domain Preview and Production availability separate from code wiring.
