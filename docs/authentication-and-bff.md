# Clinic Dashboard Authentication and BFF Architecture

> **Canonical decision:**
> [Website ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md)
>
> **Paired website architecture:**
> [Clinic Dashboard application and API architecture](https://github.com/findmydoc-platform/website/blob/main/docs/integrations/clinic-dashboard-api.md)
>
> **Repository responsibility:** This repository owns the Dashboard BFF, session cookies, password login, explicitly confirmed TokenHash callbacks,
> refresh and logout, server-only Payload client, capability-specific Route Handlers, environment validation, and
> user-facing auth and upstream-error states. The website repository owns Payload authentication, authorization,
> business endpoints, and DTO contracts.
>
> **Synchronization rule:** Shared routes, DTOs, error semantics, environment assumptions, and security controls must
> be updated in both architecture documents within the same implementation change. Neither repository may infer a new
> cross-repository contract from runtime code alone.

## Runtime Status and Scope

The Supabase session boundary and Payload bootstrap are implemented. Trusted preview and production rollout evidence
remain required before cutover. Authenticated staff and clinic identity are real; all dashboard business content remains
fixture-backed and visibly marked as demo data.

This document records the durable authentication and Backend for Frontend architecture of the stateless Next.js
application. It is not an execution plan. The Dashboard owns no database, durable business cache, Supabase service-role
key, browser-readable auth token, or generic Payload proxy.

## Target Request Shape

```text
Dashboard Browser
  -> React Server Component or same-origin Route Handler
  -> server-only Payload client with current Supabase access token
  -> Payload REST or focused custom endpoint
  -> current clinicStaff authorization and purpose-specific DTO
```

React Server Components call the server-only data layer directly. They never call the application's Route Handlers over
HTTP. Client Components call only capability-specific same-origin routes. A browser request cannot select an arbitrary
Payload path, collection, query, actor, clinic, or authorization scope.

## Module Boundaries

The architecture keeps these responsibilities separate:

| Module                     | Responsibility                                                                                                                 | Prohibited responsibility                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Environment contract       | Validate Dashboard origin, Supabase URL, publishable key, Payload API URL, and environment pairing at startup.                 | Deriving trust from an unchecked request `Host` header.                                    |
| Server Supabase factory    | Create one cookie-aware client per request and expose login, callback, refresh, logout, and current-session operations.        | Global clients, browser clients, service-role operations, or shared user state.            |
| Session cookie adapter     | Read request cookies and apply every returned cookie and cache header to the final response.                                   | Exposing access or refresh tokens to Client Components.                                    |
| Server-only Payload client | Send the current access token as a Bearer token and map upstream failures.                                                     | Direct database access or accepting browser-provided Payload paths.                        |
| Dashboard data layer       | Fetch typed capability DTOs for React Server Components and request-local deduplication.                                       | Persistent caching or internal HTTP calls to Route Handlers.                               |
| Route Handlers             | Compose one shared mutation guard for session, input, exact origin, session-bound HMAC-CSRF, and capability-specific commands. | Reimplementing Payload tenant or permission decisions or duplicating CSRF logic per route. |

Server-only modules must use the framework's server-only boundary and must never be imported by Client Components or
Storybook.

## Session and Cookie Contract

- Supabase owns the access and refresh session.
- The Dashboard stores session material only in host-bound cookies with `HttpOnly`, `Path=/`, and no `Domain`
  attribute. Deployed environments require `Secure`; `SameSite=Lax` supports top-level email callbacks.
- Authentication and refresh responses copy every cookie mutation and cache-control header returned by the Supabase
  server client.
- Any response that reads, refreshes, establishes, or clears a session uses `Cache-Control: private, no-store`, with
  compatible `Pragma` and `Expires` headers where required.
- Supabase and request-specific state are created per request. No module-level user client or session cache exists.
- Browser application code receives neither access nor refresh token and creates no Supabase browser client.
- One failed authenticated request may trigger one controlled refresh and retry. A second authentication failure clears
  invalid cookies and enters the login state; upstream availability errors do not clear the session.

## Authentication Routes

The Dashboard owns these same-origin contracts:

| Route                      | Method | Contract                                                                                                                                                   |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/login`          | `POST` | Validate email, password, CSRF, exact origin, and the fixed internal destination; call `signInWithPassword` server-side and return a controlled redirect.  |
| `/auth/callback`           | `GET`  | Validate TokenHash, flow type, and exact destination without consuming the token; redirect only to the configured Dashboard origin and confirmation page.  |
| `/api/auth/callback`       | `POST` | Validate CSRF and exact origin, call `verifyOtp` once, establish cookies, verify clinic account eligibility, and return only the allowed completion route. |
| `/api/auth/password/reset` | `POST` | Accept a valid email and return the same neutral `202` response whether or not an eligible account exists.                                                 |
| Invite/reset completion    | `POST` | Require the temporary verified session, enforce the eight-character matching password rule, update the password, sign out, and return to normal login.     |
| `/api/auth/logout`         | `POST` | Validate origin and CSRF, revoke the Supabase session as supported, clear local session cookies, and return a controlled login destination.                |
| `/api/dashboard/bootstrap` | `GET`  | Return the typed self-and-capability DTO for client-side refreshes. React Server Components call the same server data function directly instead.           |

Refresh is primarily a server-session utility used before authenticated Payload calls. A separate public refresh route
is unnecessary unless a later UI flow demonstrates the need. Callback and login failures return sanitized error codes;
they never return Supabase response bodies, token hashes, or provider details to application UI.

## CSRF and Origin Contract

Every authenticated state-changing Route Handler composes one central mutation guard. Route implementations cannot
replace or partially reproduce the guard. The guard:

1. requires the exact configured Dashboard origin in `Origin`;
2. rejects missing or mismatched browser origins;
3. validates a stateless HMAC-signed CSRF token from a host-bound cookie against the request header using timing-safe
   comparisons;
4. binds the HMAC to the current validated Supabase session plus a random nonce, so a token from another session is
   rejected;
5. in deployed environments requires `Secure`, `Path=/`, and no `Domain` attribute;
6. validates content type and request schema before any upstream call; and
7. derives principal, clinic, and actor from the authenticated Payload result.

The CSRF token contains no access token, refresh token, Supabase identifier, or clinic data. Its session binding is
derived server-side and is not emitted as cleartext. The CSRF cookie is intentionally readable by same-origin browser
code so the value can be sent in the header; session cookies remain `HttpOnly`. The server-only
`CSRF_SIGNING_SECRET` signs tokens and must contain at least 32 cryptographically random bytes. A public page receives
an anonymous pre-session token before login, reset, or email-link confirmation. After a session is established, the
token is reissued against the session cookie fingerprint. Login, callback confirmation, logout, password completion,
and every later authenticated capability mutation use the shared guard.

A contract test inventories state-changing Route Handlers and fails when an authenticated mutation is not wrapped by
the central guard. Fetch Metadata headers may provide defense in depth but do not replace explicit origin and CSRF
validation. Payload receives only the authorized business request and requires no CSRF-specific implementation.

## Payload Client and DTO Contract

The Payload client receives an access token only from the current server session. It uses REST resources and focused
custom endpoints from the paired website architecture. The first custom contract is the self-and-capability bootstrap.

For each environment, the client accepts one exact HTTPS Payload origin and configures authenticated fetches to reject
redirects. An origin mismatch, non-HTTPS target, or cross-environment URL fails before the first token-bearing request.
A redirect response fails without sending the Bearer token to the redirect target.

The Dashboard consumes this synchronized initial contract:

```ts
type ClinicDashboardCapability = "clinic-profile:view" | "clinic-profile:edit"

type ClinicDashboardBootstrapDTO = {
  principal: {
    id: string
    displayName: string
    email: string
  }
  clinic: {
    id: string
    name: string
  }
  status: "approved"
  capabilities: ClinicDashboardCapability[]
}
```

The capability list contains each value exactly once in the order shown. It is a UI projection for profile display and
editing controls, not a replacement for Payload authorization. Each later read or mutation must still authorize the
current principal, clinic, document, and fields.

The client rejects a response that does not match the expected DTO. It never forwards raw Payload documents, Supabase
identifiers, tokens, internal roles, permission internals, or unapproved clinic fields to Client Components.

## Error and UI State Mapping

The website bootstrap exposes three stable upstream errors that the Dashboard must preserve without displaying raw
upstream details:

| Payload bootstrap response                            | Meaning                                                                             | Dashboard behavior                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `401` with `CLINIC_DASHBOARD_UNAUTHORIZED`            | Missing or invalid Bearer token, wrong principal type, or no matching clinic staff. | Attempt one controlled session refresh; persistent failure clears invalid cookies and enters the login state. |
| `403` with `CLINIC_DASHBOARD_ACCESS_DENIED`           | Clinic staff is not approved or has no current clinic assignment.                   | Preserve the session and render the appropriate access state without clinic data.                             |
| `503` with `CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE` | Supabase or Payload is temporarily unavailable.                                     | Preserve the session and render a retryable service state rather than logging the user out.                   |

Every upstream bootstrap response is private and carries `Cache-Control: private, no-store`, `Pragma: no-cache`,
`Expires: 0`, and `Vary: Authorization`. The Dashboard response must retain equivalent private no-store behavior.

| Condition                                                          | BFF behavior                                                               | Required UI state                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| No session or invalid session after one refresh                    | Return `401`, clear invalid cookies.                                       | Login required; preserve only a validated relative destination. |
| Valid identity without a matching clinic principal                 | Return `401`; do not provision staff.                                      | Account unavailable without exposing internal identity details. |
| Pending or rejected staff, missing clinic, or forbidden capability | Return `403`; preserve session.                                            | Access pending, denied, or unavailable as a controlled state.   |
| Invalid or expired TokenHash link                                  | Clear incomplete auth state and return a sanitized auth error.             | Login screen with a retry action.                               |
| Invalid input                                                      | Return `400` with a stable safe error code.                                | Field or command error without raw upstream details.            |
| Business conflict                                                  | Return `409` with a stable safe error code.                                | Refresh or resolve the changed state.                           |
| Payload unavailable or timed out                                   | Return `502` or `504`; preserve session.                                   | Temporary service error with retry.                             |
| Supabase unavailable during refresh                                | Return a temporary upstream error; preserve cookies unless proven invalid. | Temporary authentication-service error, not logout.             |
| Origin or CSRF rejection                                           | Return `403` without an upstream call.                                     | Generic rejected-request state; no sensitive detail.            |

All protected pages require explicit loading, empty, forbidden, expired-session, and upstream-unavailable states before
their temporary prototype gate is removed.

## Environment Contract

| Environment          | Expected origin                       | Supabase   | Payload API                          | Allowed callback                                                |
| -------------------- | ------------------------------------- | ---------- | ------------------------------------ | --------------------------------------------------------------- |
| Local                | `http://localhost:3000`               | Staging    | Exact `https://preview.findmydoc.eu` | Exact `http://localhost:3000/auth/callback`                     |
| Pull-request preview | Current trusted Vercel deployment URL | Staging    | Exact `https://preview.findmydoc.eu` | `https://clinic-dashboard-*-findmydoc.vercel.app/auth/callback` |
| Production           | `https://clinics.findmydoc.eu`        | Production | Exact `https://findmydoc.eu`         | Exact `https://clinics.findmydoc.eu/auth/callback`              |

The environment contract validates `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYLOAD_API_URL`, the expected Dashboard
origin, and the server-only `CSRF_SIGNING_SECRET` as one bundle. No service-role key is accepted. `PAYLOAD_API_URL` must
equal the exact environment origin in the table; HTTPS and redirect rejection are mandatory. Preview origin derivation
may use trusted Vercel metadata only after validating HTTPS and the expected project suffix. The existing random Vercel
deployment URLs remain unchanged.

## Cache Contract

Session, principal, clinic, capability, and authenticated Dashboard reads are `private-live`. Protected Route Handlers
and pages opt out of ISR, shared caches, durable Dashboard caches, and Vercel Data Cache storage. Request-local
deduplication during one server render is allowed.

When an authorized Dashboard command changes data rendered on the public website, Payload still executes the existing
public revalidation contract for the affected surfaces. The private BFF response does not suppress, replace, or defer
that invalidation. This architecture introduces no new cache class, tag family, owner, or event.

Client libraries may keep transient component state for interaction quality, but that state is not authoritative and
must be discarded or reconciled after mutations, permission changes, or session failure.

## Verification Contract

The architecture remains valid only while the following properties hold:

- Unit-test environment pairing, exact Payload origins, redirect rejection, TokenHash callback validation,
  internal-destination validation, cookie attributes, cookie propagation, one-refresh retry, session clearing, origin
  checks, CSRF signature validation, session binding, and host-only cookie requirements.
- Contract-test that every authenticated state-changing Route Handler composes the central mutation guard and that
  Payload requires no CSRF-specific behavior.
- Contract-test the bootstrap DTO and every stable error mapping against the synchronized website contract.
- Verify that Client Component bundles and Storybook contain no Supabase client, access token, refresh token, service
  role, or server-only Payload module.
- Verify through browser network evidence that application data requests stay on the Dashboard origin and no browser
  request reaches Payload.
- Verify server-rendered pages do not make internal HTTP requests to Dashboard Route Handlers.
- Verify local and trusted Vercel previews against Staging Supabase and the website Preview API, including password
  login plus explicitly confirmed invite and recovery TokenHash links.
- Verify `401`, `403`, invalid callback, invalid origin, invalid CSRF, Payload outage, Supabase outage, and retry behavior.
- Verify authenticated responses are private and not present in shared or durable caches.
- Verify public-impacting Payload mutations retain their existing website revalidation behavior.

## Explicit Non-goals

- Direct browser access to Payload or Payload CORS expansion.
- A generic proxy, mandatory GraphQL layer, or Server Actions as public backend contracts.
- A Dashboard database, durable copy of Payload data, shared authenticated cache, or service-role credential.
- Stable pull-request-number aliases or a callback relay application.
- Portal session transfer or a clinic login form in the portal.
- Capability-specific business features beyond their shared BFF and API boundary.
