# Supabase Session and Payload API Profile

This profile is planned, not implemented.

## Boundary

- The Clinic Dashboard is a stateless Next.js Backend for Frontend without a database.
- Supabase will establish the clinic user's access and refresh session through Dashboard-owned login, PKCE callback,
  refresh, and logout routes.
- The Dashboard will store session material in secure, host-bound, `HttpOnly` cookies. Browser application code will
  receive no token and create no Supabase browser client.
- React Server Components will read through a server-only Payload client. Browser-initiated reads and mutations will
  use capability-specific, same-origin Route Handlers.
- The Dashboard server will send the current access token to Payload as a Bearer token.
- Payload remains the source of truth and the authorization boundary for clinic data.
- Payload will resolve current `clinicStaff` approval, clinic assignment, and capabilities for every request.
- Platform staff continue to use Payload Admin.
- The Clinic Dashboard receives no direct Postgres connection, Supabase service-role secret, or durable business cache.
- Payload CORS remains unchanged because the Dashboard browser never calls Payload.

## Request and Cache Rules

- Create Supabase clients and user-specific state per request; never share them across requests.
- Use the Supabase publishable key only.
- Preserve every session cookie and cache-control header returned by authentication and refresh handling.
- Validate callback origins from environment configuration or trusted Vercel metadata, never from an unchecked `Host`
  header.
- Accept only validated relative post-authentication destinations.
- Apply one shared mutation guard to every authenticated state-changing Route Handler. It validates session, input,
  exact origin, and a stateless HMAC-signed CSRF token bound to the current Supabase session. Staging and Production use
  a host-only `__Host-` CSRF cookie; Payload requires no change.
- Keep session, principal, clinic, capability, and Dashboard data private and `no-store`. Request-local deduplication is
  permitted; ISR, shared caches, and durable Dashboard caches are not.
- Preserve the website's existing public revalidation when an authorized Payload mutation changes a public surface.

## Environments

| Environment          | Supabase   | Payload API                          | Callback                                                        |
| -------------------- | ---------- | ------------------------------------ | --------------------------------------------------------------- |
| Local                | Staging    | Exact `https://preview.findmydoc.eu` | Exact local callback                                            |
| Pull-request preview | Staging    | Exact `https://preview.findmydoc.eu` | Project-specific Vercel wildcard restricted to `/auth/callback` |
| Production           | Production | Exact `https://findmydoc.eu`         | Exact `https://clinics.findmydoc.eu/auth/callback`              |

Cross-environment combinations fail configuration validation. The Payload client requires HTTPS, rejects redirects,
and never forwards the Bearer token to another origin.

## Implementation Gate

The architecture is approved by
[ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md).
Implementation follows
[the local authentication and BFF plan](../plans/clinic-dashboard-auth-and-bff-integration.md) and remains a separate
runtime change. Do not infer new shared contracts from this profile or from prototype controls.
