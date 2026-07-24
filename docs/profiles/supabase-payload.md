# Supabase Session and Payload API Profile

This profile is active. Trusted preview and production rollout evidence remain pending.

## Boundary

- The Clinic Dashboard is a stateless Next.js Backend for Frontend without a database.
- Supabase establishes the clinic user's access and refresh session through Dashboard-owned password login, explicitly
  confirmed TokenHash invite/recovery callbacks, refresh, and logout routes.
- The Dashboard stores session material in secure, host-bound, `HttpOnly` cookies. Browser application code receives
  no token and creates no Supabase browser client.
- React Server Components read through a server-only Payload client. Browser-initiated reads and mutations
  use capability-specific, same-origin Route Handlers.
- The Dashboard server sends the current access token to Payload as a Bearer token.
- Payload remains the source of truth and the authorization boundary for clinic data.
- Payload resolves current `clinicStaff` approval, clinic assignment, and capabilities for every request.
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
  exact origin, and a stateless HMAC-signed CSRF token bound to the current Supabase session. Public forms receive a
  pre-session token; deployed cookies are host-only and secure. Payload requires no CSRF-specific change.
- Keep session, principal, clinic, capability, and Dashboard data private and `no-store`. Request-local deduplication is
  permitted; ISR, shared caches, and durable Dashboard caches are not.
- Preserve the website's existing public revalidation when an authorized Payload mutation changes a public surface.

## Environments

| Environment          | Supabase   | Payload API                          | Callback                                                        |
| -------------------- | ---------- | ------------------------------------ | --------------------------------------------------------------- |
| Local                | Staging    | Exact `https://preview.findmydoc.eu` | Exact local callback                                            |
| Pull-request preview | Staging    | Exact `https://preview.findmydoc.eu` | Project-specific Vercel wildcard restricted to `/auth/callback` |
| Main preview         | Staging    | Exact `https://preview.findmydoc.eu` | Exact `https://clinics.preview.findmydoc.eu/auth/callback`      |
| Production           | Production | Exact `https://findmydoc.eu`         | Exact `https://clinics.findmydoc.eu/auth/callback`              |

Cross-environment combinations fail configuration validation. The Payload client requires HTTPS, rejects redirects,
and never forwards the Bearer token to another origin.

## Architecture Source

The architecture is approved by
[ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md).
The detailed repository contract is
[the local authentication and BFF architecture](../authentication-and-bff.md). Do not infer new shared contracts from
this profile or from prototype controls.
