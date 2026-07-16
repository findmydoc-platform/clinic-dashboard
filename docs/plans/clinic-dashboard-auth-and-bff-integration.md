# Clinic Dashboard Authentication and BFF Integration Plan

> **Canonical decision:**
> [Website ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md)
>
> **Paired website plan:**
> [Clinic Dashboard application and API implementation plan](https://github.com/findmydoc-platform/website/blob/main/docs/roadmap/clinic-dashboard/application-api-architecture.md)
>
> **Repository responsibility:** This repository owns the Dashboard BFF, session cookies, PKCE login and callback,
> refresh and logout, server-only Payload client, capability-specific Route Handlers, environment validation, and
> user-facing auth and upstream-error states. The website repository owns Payload authentication, authorization,
> business endpoints, and DTO contracts.
>
> **Synchronization rule:** Shared routes, DTOs, error semantics, environment assumptions, and security controls must
> be updated in both implementation plans within the same implementation change. Neither repository may infer a new
> cross-repository contract from runtime code alone.

## Status and Scope

Status: planned. The current application remains fixture-backed and protected by its temporary password guard. This
document defines the later replacement; it does not implement it.

The target is a stateless Next.js Backend for Frontend. It owns no database, durable business cache, Supabase
service-role key, browser-readable auth token, or generic Payload proxy.

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

The implementation should keep these responsibilities separate:

| Module                     | Responsibility                                                                                                          | Prohibited responsibility                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Environment contract       | Validate Dashboard origin, Supabase URL, publishable key, Payload API URL, and environment pairing at startup.          | Deriving trust from an unchecked request `Host` header.                         |
| Server Supabase factory    | Create one cookie-aware client per request and expose login, callback, refresh, logout, and current-session operations. | Global clients, browser clients, service-role operations, or shared user state. |
| Session cookie adapter     | Read request cookies and apply every returned cookie and cache header to the final response.                            | Exposing access or refresh tokens to Client Components.                         |
| Server-only Payload client | Send the current access token as a Bearer token and map upstream failures.                                              | Direct database access or accepting browser-provided Payload paths.             |
| Dashboard data layer       | Fetch typed capability DTOs for React Server Components and request-local deduplication.                                | Persistent caching or internal HTTP calls to Route Handlers.                    |
| Route Handlers             | Validate session, input, origin, CSRF, and capability-specific commands for browser interactions.                       | Reimplementing Payload tenant or permission decisions.                          |

Server-only modules must use the framework's server-only boundary and must never be imported by Client Components or
Storybook.

## Session and Cookie Contract

- Supabase owns the access and refresh session.
- The Dashboard stores session material only in host-bound cookies with `HttpOnly`, `Path=/`, and no `Domain`
  attribute. Deployed environments require `Secure`; `SameSite=Lax` supports the top-level PKCE callback.
- Authentication and refresh responses copy every cookie mutation and cache-control header returned by the Supabase
  server client.
- Any response that reads, refreshes, establishes, or clears a session uses `Cache-Control: private, no-store`, with
  compatible `Pragma` and `Expires` headers where required.
- Supabase and request-specific state are created per request. No module-level user client or session cache exists.
- Browser application code receives neither access nor refresh token and creates no Supabase browser client.
- One failed authenticated request may trigger one controlled refresh and retry. A second authentication failure clears
  invalid cookies and enters the login state; upstream availability errors do not clear the session.

## Authentication Routes

The implementation owns these same-origin contracts:

| Route                      | Method | Contract                                                                                                                                                                                       |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/login`          | `POST` | Validate input and internal destination, initialize PKCE, and start the Supabase authentication flow.                                                                                          |
| `/auth/callback`           | `GET`  | Validate the callback environment and state, exchange the authorization code, establish cookies, verify the current clinic principal, and redirect only to an allowed relative Dashboard path. |
| `/api/auth/logout`         | `POST` | Validate origin and CSRF, revoke the Supabase session as supported, clear local session cookies, and return a controlled login destination.                                                    |
| `/api/dashboard/bootstrap` | `GET`  | Return the typed self-and-capability DTO for client-side refreshes. React Server Components call the same server data function directly instead.                                               |

Refresh is primarily a server-session utility used before authenticated Payload calls. A separate public refresh route
is unnecessary unless a later UI flow demonstrates the need. Callback and login failures return sanitized error codes;
they never return Supabase response bodies or authorization codes to application UI.

## CSRF and Origin Contract

Every state-changing Route Handler:

1. requires the exact configured Dashboard origin in `Origin`;
2. rejects missing or mismatched browser origins;
3. validates a host-bound double-submit CSRF cookie against a request header using a timing-safe comparison;
4. validates content type and request schema before any upstream call; and
5. derives principal, clinic, and actor from the authenticated Payload result.

The CSRF value is not an authentication token and may be readable by same-origin browser code. Session cookies remain
`HttpOnly`. Login and callback additionally validate PKCE state and allow only known relative destinations. Fetch
Metadata headers may provide defense in depth but do not replace the explicit origin and CSRF checks.

## Payload Client and DTO Contract

The Payload client receives an access token only from the current server session. It uses REST resources and focused
custom endpoints from the paired website plan. The first custom contract is the self-and-capability bootstrap.

The Dashboard consumes a generated or otherwise synchronized `ClinicDashboardBootstrapDTO` containing only:

- safe current-principal display fields;
- safe clinic identity fields;
- the approved status; and
- a closed union of allowed Dashboard capabilities.

The client rejects a response that does not match the expected DTO. It never forwards raw Payload documents, Supabase
identifiers, tokens, internal roles, permission internals, or unapproved clinic fields to Client Components.

## Error and UI State Mapping

| Condition                                                          | BFF behavior                                                               | Required UI state                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| No session or invalid session after one refresh                    | Return `401`, clear invalid cookies.                                       | Login required; preserve only a validated relative destination. |
| Valid identity without a matching clinic principal                 | Return `401`; do not provision staff.                                      | Account unavailable without exposing internal identity details. |
| Pending or rejected staff, missing clinic, or forbidden capability | Return `403`; preserve session.                                            | Access pending, denied, or unavailable as a controlled state.   |
| Invalid callback code or state                                     | Clear incomplete auth state and return a sanitized auth error.             | Login screen with a retry action.                               |
| Invalid input                                                      | Return `400` with a stable safe error code.                                | Field or command error without raw upstream details.            |
| Business conflict                                                  | Return `409` with a stable safe error code.                                | Refresh or resolve the changed state.                           |
| Payload unavailable or timed out                                   | Return `502` or `504`; preserve session.                                   | Temporary service error with retry.                             |
| Supabase unavailable during refresh                                | Return a temporary upstream error; preserve cookies unless proven invalid. | Temporary authentication-service error, not logout.             |
| Origin or CSRF rejection                                           | Return `403` without an upstream call.                                     | Generic rejected-request state; no sensitive detail.            |

All protected pages require explicit loading, empty, forbidden, expired-session, and upstream-unavailable states before
their temporary prototype gate is removed.

## Environment Contract

| Environment          | Expected origin                       | Supabase   | Payload API        | Allowed callback                                                |
| -------------------- | ------------------------------------- | ---------- | ------------------ | --------------------------------------------------------------- |
| Local                | `http://localhost:3000`               | Staging    | Website Preview    | Exact `http://localhost:3000/auth/callback`                     |
| Pull-request preview | Current trusted Vercel deployment URL | Staging    | Website Preview    | `https://clinic-dashboard-*-findmydoc.vercel.app/auth/callback` |
| Production           | `https://clinics.findmydoc.eu`        | Production | Website Production | Exact `https://clinics.findmydoc.eu/auth/callback`              |

The initial environment contract validates `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYLOAD_API_URL`, and the
expected Dashboard origin as one bundle. These names are planned, not current configuration. No service-role key is
accepted. Preview origin derivation may use trusted Vercel metadata only after validating HTTPS and the expected project
suffix. The existing random Vercel deployment URLs remain unchanged.

## Cache Contract

Session, principal, clinic, capability, and Dashboard business data are `private-live`. Protected Route Handlers and
pages opt out of ISR, shared caches, durable Dashboard caches, and Vercel Data Cache storage. Request-local
deduplication during one server render is allowed.

Client libraries may keep transient component state for interaction quality, but that state is not authoritative and
must be discarded or reconciled after mutations, permission changes, or session failure.

Cache impact for this documentation change: `no-public-impact`.

## Implementation Sequence

1. Add environment validation and per-request Supabase server-client tests without replacing the temporary guard.
2. Implement PKCE login, callback, refresh utility, logout, cookie propagation, origin validation, and CSRF checks.
3. Implement the server-only Payload client and typed error mapping against the website bootstrap branch.
4. Add the server data layer and bootstrap Route Handler, keeping React Server Components on direct function calls.
5. Replace the temporary guard only after local and trusted preview authentication, principal, cookie, CSRF, and failure
   tests pass.
6. Integrate capability-specific reads and mutations one gate at a time; remove each temporary gate when the complete
   server-authorized flow exists.
7. Configure the exact production callback only after Staging preview evidence is complete.

## Test and Acceptance Plan

- Unit-test environment pairing, callback-origin validation, internal-destination validation, cookie attributes, cookie
  propagation, one-refresh retry, session clearing, origin checks, and CSRF checks.
- Contract-test the bootstrap DTO and every stable error mapping against the website implementation branch.
- Verify that Client Component bundles and Storybook contain no Supabase client, access token, refresh token, service
  role, or server-only Payload module.
- Verify through browser network evidence that application data requests stay on the Dashboard origin and no browser
  request reaches Payload.
- Verify server-rendered pages do not make internal HTTP requests to Dashboard Route Handlers.
- Verify local and trusted Vercel previews against Staging Supabase and the website Preview API, including successful
  PKCE return to the original deployment URL.
- Verify `401`, `403`, invalid callback, invalid origin, invalid CSRF, Payload outage, Supabase outage, and retry behavior.
- Verify authenticated responses are private and not present in shared or durable caches.
- Retain fixture-backed Storybook states until each equivalent source-backed state has complete loading, empty, denied,
  and failure coverage.

## Explicit Non-goals

- Direct browser access to Payload or Payload CORS expansion.
- A generic proxy, mandatory GraphQL layer, or Server Actions as public backend contracts.
- A Dashboard database, durable copy of Payload data, shared authenticated cache, or service-role credential.
- Stable pull-request-number aliases or a callback relay application.
- Portal session transfer or a clinic login form in the portal.
- Implementation of capability-specific business features owned by later work.
