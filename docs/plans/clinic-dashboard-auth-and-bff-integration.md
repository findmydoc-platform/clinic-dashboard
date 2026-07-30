# Clinic Dashboard Authentication and BFF Integration Plan

> **Canonical decision:**
> [Website ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md)
>
> **Durable Dashboard contract:**
> [Clinic Dashboard authentication and BFF architecture](../authentication-and-bff.md)
>
> **Paired website plan:**
> [Clinic Dashboard application and API implementation plan](https://github.com/findmydoc-platform/website/blob/main/docs/roadmap/clinic-dashboard/application-api-architecture.md)
>
> **Paired website contract:**
> [Clinic Dashboard application and API architecture](https://github.com/findmydoc-platform/website/blob/main/docs/integrations/clinic-dashboard-api.md)

## Status and Scope

Status: implemented in code; trusted preview and production rollout evidence pending. This document owns implementation order and acceptance evidence only. Durable session, BFF, API,
environment, security, error, and cache contracts live in the paired architecture documents and must not be redefined
here.

The runtime work replaces the temporary password guard with Supabase session handling and the server-only Payload BFF.
It introduces no Dashboard database, service-role credential, browser-readable auth token, generic Payload proxy, or
Payload CORS expansion.

## Implementation Sequence

1. Add environment validation and per-request Supabase server-client tests.
2. Implement server-side password login, explicit TokenHash invite/recovery confirmation, refresh, logout, cookie
   propagation, environment-scoped trusted-origin validation, and the central HMAC-CSRF guard.
3. Implement the server-only Payload client against `GET /api/clinic-dashboard/bootstrap`. Validate the exact DTO with
   profile and treatment view/edit capabilities, classify the three stable `CLINIC_DASHBOARD_*` error codes, and
   preserve private no-store semantics.
4. Add the server data layer and bootstrap Route Handler while keeping React Server Components on direct function
   calls.
5. Validate the replacement locally, then prove authentication, principal, cookie, CSRF, and failure states on the
   trusted preview before merge and environment cleanup.
6. Integrate capability-specific reads and mutations one gate at a time.
7. Configure the exact production callback only after Staging preview evidence is complete.

## Coordination Rules

- Update both durable architecture documents whenever a shared route, DTO, error, environment, or security contract
  changes.
- Keep implementation sequencing and temporary branch coordination in the two plan documents.
- Do not infer a backend contract from fixture data, prototype controls, or work-tracking text.
- The Dashboard owns its BFF and user-facing states. The website owns Payload authorization, endpoints, and DTOs.

## Acceptance Evidence

- Browser application data requests stay on the Dashboard origin and no browser request reaches Payload.
- Browser JavaScript receives no Supabase access or refresh token.
- The server-only client accepts the previous two-capability bootstrap during rollout and the exact four-capability
  profile-and-treatment contract.
- `CLINIC_DASHBOARD_UNAUTHORIZED`, `CLINIC_DASHBOARD_ACCESS_DENIED`, and
  `CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE` produce the synchronized controlled states without exposing upstream
  details.
- Every authenticated mutation uses the shared session-bound HMAC-CSRF guard.
- Server-rendered pages make no internal HTTP request to Dashboard Route Handlers.
- Local and trusted Vercel previews complete password login plus explicitly confirmed TokenHash invite and recovery
  against Staging and return to the original deployment URL.
- Invalid sessions, denied principals, invalid callbacks, upstream failures, and cross-environment configuration produce
  the documented controlled states.
- Authenticated responses remain private and absent from shared or durable caches.
- Public-impacting Payload mutations retain the website revalidation contract.

Cache impact for this documentation and implementation plan: `no-public-impact`.
