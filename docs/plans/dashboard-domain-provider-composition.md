# Dashboard Domain Provider Composition Plan

> **Approved architecture plan — 2026-07-27.** This plan makes patient-inquiry reads and writes use one
> domain-specific server provider before doctor management begins.

## User Outcome And Audience

Clinic staff keep the existing inquiry queue and status workflow without visible behavior changes. Dashboard engineers
gain one enforced composition point for local Controlled data and live Payload data, so the next approved live domain
can follow the same security and failure boundaries without extending the fixture workspace provider.

The primary audience is Dashboard and website platform engineering. The operational audience is responsible for
Preview and Production environment pairing; no new operator control is introduced.

## Scope

- Add the private server-only `PatientInquiryProvider` contract with `loadQueue()` and
  `changeStatus({ inquiryId, status })`.
- Add a typed `ClinicDashboardDataProviders` map that starts with the explicit `inquiries` key.
- Move Controlled-versus-Payload selection into one server-only composition module.
- Bind providers to the verified request access token after session resolution.
- Keep `server.ts` as the production composition root and inject the inquiry-provider factory into the status handler.
- Move current-inquiry loading, transition validation, and status persistence behind `changeStatus`.
- Return closed provider results and map them to the existing queue and route states.
- Preserve the fixture-backed workspace provider for all remaining demo areas.
- Enforce the boundaries through the architecture checker and accepted/rejected process fixtures.
- Record the durable decision in [ADR 0003](../adr/0003-domain-data-provider-composition.md).

## Access, Data Classification, And Storage

Inquiry identity, contact details, treatment interest, message text, and workflow status are private clinic data.
Every read and mutation requires the existing server-side Supabase session and website-authorized clinic identity.
Payload remains the source of truth; the Dashboard stores no durable copy.

The access token stays server-only and is bound to the request-scoped Payload provider. Authenticated reads and
responses remain `private, no-store`. The browser calls only the existing same-origin status route and never receives a
Payload URL, Bearer token, raw Payload document, tenant identifier, or upstream error body.

Controlled mode uses synthetic deterministic data only in local or test execution. It is rejected in Preview,
Production, and a production Node environment. Controlled changes live in browser state until reload; reload restores
the initial snapshot. Payload failure never falls back to Controlled data.

## Architecture And Data Flow

```text
React Server Component
  -> server.ts
     -> verified session access token
     -> composeClinicDashboardDataProviders(accessToken)
        -> inquiries: Controlled or Payload PatientInquiryProvider
     -> inquiries.loadQueue()

Client inquiry status command
  -> same-origin PATCH route
     -> origin, CSRF, input, session, and clinic access checks
     -> server.ts provider factory
        -> inquiries.changeStatus({ inquiryId, status })
           -> Payload adapter: GET current -> transition check -> PATCH
```

`ClinicDashboardDataProviders` is a static typed map, not a dynamic registry. A later approved live domain adds a named
contract, Controlled implementation, Payload implementation, one explicit map key, and its own tests.

The remaining workspace continues through `ClinicDashboardWorkspaceProvider.loadWorkspace()`. That aggregate fixture
boundary does not acquire live operations or source-selection responsibility.

## Provider And Error Contract

Provider results are discriminated unions:

```ts
type ProviderResult<Value, Error> =
  Readonly<{ ok: true; value: Value }> | Readonly<{ error: Error; ok: false }>
```

Queue reads return `unauthorized`, `forbidden`, or `temporarily-unavailable`. Status changes may additionally return
`not-found` or `conflict`. The same-origin route preserves its public error codes:

- unknown inquiry: `404 INQUIRY_NOT_FOUND`;
- repeated or disallowed transition: `409 INQUIRY_STATUS_CONFLICT`;
- missing session: `401 INQUIRY_UNAUTHORIZED`;
- denied access: `403 INQUIRY_ACCESS_DENIED`;
- unavailable provider or malformed upstream data: `503 INQUIRY_SERVICE_UNAVAILABLE`.

Initial queue failures continue to produce the existing `temporarily-unavailable` Messages state. Raw upstream details
never cross the provider contract.

## UI And Browser Contract

No UI, route path, request body, success body, command signature, Storybook story, or visible copy changes. Existing
loading, queue, status, error, and reload behavior remains the acceptance baseline. Light and dark mode rendering is
unaffected.

## Test And Acceptance Plan

- Shared provider contract: ready queue shape, allowed status change, unknown inquiry, and conflicting transition
  against Controlled and Payload implementations.
- Payload adapter unit tests: upstream schema validation, DTO minimization, request headers, redirect rejection,
  `no-store`, hidden read-before-write sequence, HTTP mapping, and network failure.
- Controlled adapter unit tests: deterministic initial data, successful local result, and reset on the next load.
- Composition unit tests: Controlled selection, Payload selection, required token, and fail-closed Preview/Production
  configuration.
- Integration tests: workspace load with and without a token, provider failure, unchanged status route, authentication,
  origin, CSRF, input, and private-cache behavior.
- Architecture process fixtures: accepted central wiring and rejected adapter, contract, composition, or mode imports
  from UI, App Router, Storybook, and unrelated tests.
- Existing Controlled browser smoke: status change, reload reset, and browser-context isolation.
- Complete validation with Node 24 and pnpm 10: formatting, `check`, unit, integration, Storybook, Chromium smoke,
  Storybook build, Next.js build, dependency audit, documentation checks, and AI instruction check.

No new stories, screenshots, database migrations, or authenticated mutations against live Staging inquiries are
required.

## Delivery

The work ships as one standalone pull request from the current `origin/main` and closes only
`findmydoc-platform/clinic-dashboard#87`. Doctor management in issue `#82` remains open and starts after this
architecture pull request merges.

The pull request receives the normal Vercel Preview build. No direct production deployment or authenticated live
Staging inquiry test occurs in this work. Security and test reviewers are recommended before handoff and run only
after explicit confirmation.

## Risks And Mitigations

| Risk                                                           | Mitigation                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Controlled reads and Payload writes are selected independently | One composition creates the complete typed provider map.                                         |
| A token reaches browser code or a redirect target              | Server-only boundaries, request-scoped binding, exact origin validation, and redirect rejection. |
| Route code duplicates transition or transport behavior         | The deep `changeStatus` operation owns read, validation, and write.                              |
| Payload failure silently shows synthetic data                  | Closed errors and no fallback branch.                                                            |
| A later domain grows the aggregate workspace provider          | ADR extension pattern plus architecture-checker boundaries.                                      |
| Raw upstream shape or errors leak into UI                      | Zod validation, DTO projection, and sanitized provider results.                                  |

## Explicitly Out Of Scope

- UI, copy, Storybook, or browser contract changes.
- Payload schemas, collections, database, tenant logic, permissions, or website implementation changes.
- Public routes, project profile, environment variables, Vercel project, or deployment workflow changes.
- Migration of profile, reviews, messages, support, dashboard reporting, or other fixture-backed areas.
- A generic repository, runtime plugin registry, shared authenticated cache, Dashboard database, or automatic fallback.
- Doctor management implementation from issue `#82`.
