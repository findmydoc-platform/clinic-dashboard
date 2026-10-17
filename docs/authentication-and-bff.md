# Clinic Dashboard Authentication and BFF Architecture

> **Canonical decision:**
> [Website ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md)
>
> **Paired website architecture:**
> [Clinic Dashboard application and API architecture](https://github.com/findmydoc-platform/website/blob/main/docs/integrations/clinic-dashboard-api.md)
>
> **Dashboard live-domain composition:**
> [ADR 0003: Domain Data Provider Composition](adr/0003-domain-data-provider-composition.md)
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

At checked source revision `919f28e2` (2026-10-01), server-side Supabase sessions, Payload bootstrap, and the
domain-provider composition are implemented in code. The [composition](../src/features/clinic-dashboard/data-provider-composition.ts)
selects a Payload adapter for each domain in normal mode. The [workspace loader](../src/features/clinic-dashboard/server.ts)
still starts with demo presentation data and overlays available source-backed results. Controlled providers supply
synthetic data only in local/test mode; [environment validation](../src/lib/env.ts) rejects that mode in Preview and
Production. Local inquiry acceptance is a narrow exception that uses a loopback Payload adapter with controlled auth.

| Capability | Controlled or fixture behavior                                 | Normal-mode source wiring                                                                                                  | Preview availability | Production availability |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------- |
| Doctors    | Controlled provider; demo presentation remains                 | [Payload doctor provider](../src/features/clinic-dashboard/clinic-profile/server/payload-doctor-profiles.ts) selected      | Open: not verified   | Open: not verified      |
| Gallery    | Controlled provider; demo presentation remains                 | [Payload gallery provider](../src/features/clinic-dashboard/clinic-profile/server/payload-clinic-gallery.ts) selected      | Open: not verified   | Open: not verified      |
| Inquiries  | Controlled provider; local acceptance can use loopback Payload | [Payload inquiry provider](../src/features/clinic-dashboard/messages/server/payload-inquiries.ts) selected                 | Open: not verified   | Open: not verified      |
| Profile    | Controlled provider; demo presentation remains                 | [Payload profile provider](../src/features/clinic-dashboard/clinic-profile/server/payload-clinic-profile.ts) selected      | Open: not verified   | Open: not verified      |
| Reporting  | Controlled provider; source-backed dashboard presentation      | [Payload reporting provider](../src/features/clinic-dashboard/dashboard/server/payload-reporting.ts) selected              | Open: not verified   | Open: not verified      |
| Reviews    | Controlled provider; demo presentation remains                 | [Payload review provider](../src/features/clinic-dashboard/reviews/server/payload-reviews.ts) selected                     | Open: not verified   | Open: not verified      |
| Treatments | Controlled provider; demo presentation remains                 | [Payload treatment provider](../src/features/clinic-dashboard/clinic-profile/server/payload-clinic-treatments.ts) selected | Open: not verified   | Open: not verified      |

"Open" means this documentation has no checked, capability-specific environment evidence. It does not mean the
capability is absent. A selected adapter or a successful build does not prove a deployed, reachable, authorized
workflow. Record a dated Preview or Production validation before changing either availability cell.

The restored dashboard presentation consumes the existing V1 reporting contract through the same providers. Published
profile progress and tasks remain independent of reporting failures. Five journey cards retain separate metric populations;
only Profile Views and Inquiries have matching V1 values. The other three explain unsupported measurement capabilities.
A supplementary session summary uses the returned session counts and rate. Live time-series charts and CSV downloads
remain unavailable. Notification polling does not refresh reporting. See the
[restoration plan](./plans/dashboard-visual-reference-restoration.md) for the source mapping and contract gaps. This UI
validation does not change the environment availability recorded above.

This document records the durable authentication and Backend for Frontend architecture of the stateless Next.js
application. It is not an execution plan. The Dashboard owns no database, durable business cache, Supabase service-role
key, browser-readable auth token, or generic Payload proxy.

## Target Request Shape

```text
Dashboard Browser
  -> React Server Component or same-origin Route Handler
  -> root server composition with current Supabase access token
  -> domain-specific server-only provider
  -> exact Payload request sequence
  -> Payload REST or focused custom endpoint
  -> current clinicStaff authorization and purpose-specific DTO
```

React Server Components call the server-only data layer directly. They never call the application's Route Handlers over
HTTP. Client Components call only capability-specific same-origin routes. A browser request cannot select an arbitrary
Payload path, collection, query, actor, clinic, or authorization scope.

## Module Boundaries

The architecture keeps these responsibilities separate:

| Module                       | Responsibility                                                                                                                 | Prohibited responsibility                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Environment contract         | Validate Dashboard origin, exact Supabase project URL, publishable key, Payload API URL, and environment pairing at startup.   | Deriving trust from an unchecked request `Host` header.                                  |
| Server Supabase factory      | Create one cookie-aware client per request and expose login, callback, refresh, logout, and current-session operations.        | Global clients, browser clients, service-role operations, or shared user state.          |
| Session cookie adapter       | Read request cookies and apply every returned cookie and cache header to the final response.                                   | Exposing access or refresh tokens to Client Components.                                  |
| Domain provider composition  | Bind a verified token request-locally and select each approved domain's Controlled or Payload provider in one place.           | Dynamic registration, route logic, automatic fallback, or Controlled data when deployed. |
| Domain provider contract     | Expose meaningful typed reads and changes with closed sanitized results for one live domain.                                   | Transport sequences, UI state, raw upstream documents, or broad repository operations.   |
| Server-only provider adapter | Send the current access token to exact Payload resources, validate responses, minimize DTOs, and map upstream failures.        | Direct database access or accepting browser-provided Payload paths.                      |
| Dashboard server composition | Combine the demo workspace with authorized domain results for React Server Components.                                         | Persistent caching or internal HTTP calls to Route Handlers.                             |
| Route Handlers               | Compose one shared mutation guard for session, input, exact origin, session-bound HMAC-CSRF, and capability-specific commands. | Reimplementing Payload tenant or permission decisions or duplicating provider logic.     |

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

### Initial page recovery and writable requests

The Proxy verifies the Supabase session before a protected page renders. Supabase may renew an expired session during
that verification; this is separate from the explicit recovery triggered by a Payload bootstrap `401`.

The initial React Server Component reads Payload directly through the server-only data layer. A missing verified session
goes to login. A valid clinic session rejected by Payload returns the internal `recovery-required` state and redirects to
the protected `/auth/session/recover` page. Server rendering neither writes cookies nor calls Dashboard Route Handlers
over HTTP.

The recovery page submits one same-origin form POST to `/api/auth/session/recover`. With JavaScript disabled, the user
selects Continue. The central mutation guard validates the exact origin and the session-bound HMAC-CSRF cookie against
the submitted form token. The form accepts only `attempt`, `csrf`, `mode` (`refresh` or `clear`), and the existing canonical `next`
destination (`/` or one validated inquiry deep link); duplicate fields and bodies larger than 8 KiB are rejected. Neither
route is public. The Proxy forwards newly issued CSRF cookies to the server render as well as to the browser response.

In `refresh` mode, the handler verifies the clinic session, explicitly refreshes once, and retries the bootstrap once
with the new token. Approval returns a private `303` to the destination with a signed `sessionRecovery` marker. Its HMAC
binds the verified principal, renewed access token, canonical destination, and a five-minute expiry. It grants no access.
If the following initial read receives another Payload `401`, the page passes this marker as `attempt` in `clear` mode.
Only a valid marker authorizes terminal cookie cleanup and login, without another refresh or bootstrap request. An absent,
forged, expired, or mismatched marker uses the normal refresh flow; URL parameters alone cannot authorize logout.
Login return destinations discard the
parameter. After the approved workspace mounts, it removes the marker from browser history without another server read,
so a later page reload can recover a new session failure. Without JavaScript the marker remains in the returned URL.
This prevents automatic recovery loops. A confirmed `403` or Payload outage preserves the session and opens
the existing access or temporary-service state.

Writable bootstrap and capability Route Handlers retain their own one-refresh-and-retry behavior. Every recovery
response propagates the Supabase cookie changes and private cache headers. Invalid session cleanup explicitly expires
all incoming Dashboard auth-cookie chunks, including when local sign-out fails.

The existing resolver treats a returned Supabase refresh error as an invalid session and signs out locally. Distinguishing
temporary Supabase refresh failures from proven invalid credentials remains a separate contract alignment item; issue
[#162](https://github.com/findmydoc-platform/clinic-dashboard/issues/162) does not change that classification.

The Dashboard owns these same-origin contracts:

| Route                                                 | Method                   | Contract                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/login`                                     | `POST`                   | Validate email, password, CSRF, exact origin, and the fixed internal destination; call `signInWithPassword` server-side and return a controlled redirect.                                                                                     |
| `/auth/callback`                                      | `GET`                    | Validate the bounded flow and Website action reference through `validateAction`, without consuming the Supabase token; store the signed ten-minute pending context and redirect to the fixed confirmation page.                               |
| `/api/auth/callback`                                  | `POST`                   | Validate same-origin CSRF, perform `verifyOtp`, retain the verified session, and call Website `confirmAction`. Signed subject-and-flow state resumes Website failures without consuming the token again.                                      |
| `/api/auth/password/reset`                            | `POST`                   | Forward only the email and Vercel-controlled original IP through Website `requestRecovery`; always return the neutral `202` acceptance for syntactically valid requests.                                                                      |
| Invite/reset completion                               | `POST`                   | Require the verified session and matching confirmed grant, forward the password to Website `completeAction`, and clear state/sign out only after Website completion succeeds. Exact uncertain retries preserve the original request envelope. |
| `/api/auth/logout`                                    | `POST`                   | Validate origin and CSRF, revoke the Supabase session as supported, clear local session cookies, and return a controlled login destination.                                                                                                   |
| `/auth/session/recover`                               | `GET`                    | Render the protected recovery form with one automatic submission or a Continue action without JavaScript.                                                                                                                                     |
| `/api/auth/session/recover`                           | `POST`                   | Validate the bounded form, origin and session-bound CSRF; refresh and retry once or verify and clear without refresh; propagate cookies through a private `303`.                                                                              |
| `/api/dashboard/bootstrap`                            | `GET`                    | Return the person-scoped `clinic-scope-v1` DTO for client-side refreshes. React Server Components call the same server data function directly instead.                                                                                        |
| `/api/dashboard/clinics/[clinicId]/clinic-treatments` | `GET` / `POST` / `PATCH` | Read the selected clinic's treatment offerings, add a master-treatment assignment, or update only its EUR price and active status. The clinic identity is always derived server-side.                                                         |
| `/api/dashboard/gallery`                              | `GET` / `PUT`            | Read or atomically save the assigned clinic's ordered public gallery against its current revision.                                                                                                                                            |
| `/api/dashboard/gallery/media`                        | `POST`                   | Upload one private clinic-owned draft image through a verified multipart request.                                                                                                                                                             |
| `/api/dashboard/gallery/discard`                      | `POST`                   | Schedule deletion of selected clinic-owned drafts that were not saved.                                                                                                                                                                        |
| `/api/dashboard/gallery/image`                        | `GET`                    | Stream an authorized clinic-media file through the same-origin private BFF without exposing Payload credentials or draft URLs to the browser.                                                                                                 |
| `/api/dashboard/clinics/{clinicId}/inquiries/appeal`  | `POST`                   | Submit only `{ caseId, text }` through the current clinic session, shared mutation guard, and `clinic-inquiries:view` capability. No browser-supplied actor, clinic, revision, or replay key is accepted.                                     |

Refresh is primarily a server-session utility used before authenticated Payload calls. A separate public refresh route
is unnecessary unless a later UI flow demonstrates the need. Callback and login failures return sanitized error codes;
they never return Supabase response bodies, token hashes, or provider details to application UI.

The Vercel project applies fixed-window, IP-keyed WAF limits before the application: 20 login requests per minute and
five password-reset requests per hour. Route handlers additionally reject authentication request bodies larger than
8 KiB before JSON parsing. The WAF limits are project configuration, not an application-memory counter.

### Website-owned invitation and recovery

The Dashboard consumes the [Website auth-action protocol v1](https://github.com/findmydoc-platform/website/blob/8f5ccae84c3c0ce15b8d81d68377eec83f97557d/docs/integrations/auth-action-protocol.md).
That merged contract owns action references, current principal eligibility, lifecycle transitions, original-IP recovery
admission, recipients, the existing catalog, Outbox, Lettermint and the pinned templates package `0.3.0`. Dashboard
owns no mail sender, action store, delivery retry system or service-role credential.

The server-only client signs exact JSON request bytes with an environment-specific service HMAC. It rejects redirects,
bounds response bodies to 2 KiB, uses a ten-second request deadline and accepts only the versioned closed result for
the requested operation. Dashboard receives no reference signing key. A browser-supplied action ID or destination
cannot replace the opaque `actionRef`. The existing Website invitation URL omits `next`; Dashboard derives the fixed
invitation completion route from `type`. Recovery URLs may carry the matching fixed `next`. The legacy `authActionId`
query field is ignored and never grants authority. Duplicate or unrelated query parameters are rejected.

Callback GET calls `validateAction` and neither consumes a Supabase token nor advances action state. An unavailable
validation redirects to login with instructions to reopen the original invitation or recovery email link later.
A valid result
creates the host-only `HttpOnly` pending context and redirects to `/auth/confirm` with only the flow. POST uses the
same-origin CSRF guard, consumes the token through `verifyOtp`, and confirms the action with the verified user's
access token. A temporary Website failure retains a signed `confirming` grant for that subject, flow and action.
The next POST uses the retained session and calls `confirmAction` without another `verifyOtp`. A thrown session-check
error during this continuation returns unavailable and preserves the grant and session; a missing or mismatched
verified session still fails closed. Once Website confirms,
the grant becomes `confirmed`. Signatures bind purpose, environment and configured origin. Pending and completion
contexts expire server-side ten minutes after the original GET; retries do not extend that deadline. A callback that
fails structurally or receives the Website's closed rejection shows the same invalid-or-expired public state.

The approved update-before-lifecycle-completion requirement uses the Website's existing password-completion boundary.
Dashboard forwards `{ actionRef, flow, accessToken, password }` to `completeAction`. Website performs and observes one
ordinary authenticated Supabase user password PUT before committing the lifecycle completion. Dashboard performs no
second `updateUser` call and sends no password-success boolean or AMR proof. The Website atomically completes the action
and revokes competing eligible Clinic invitation/recovery actions before releasing its subject password claim.
Dashboard signs out Recovery globally, with the existing local fallback, only after Website returns `completed`.
Invitation completion signs out locally. Both flows clear local completion state and return to the existing fixed
`/login?status=invite-complete` or `/login?status=recovery-complete` destination.

A temporary or ambiguous completion result preserves the session and signed grant. The grant carries the original
request ID, timestamp, key version and a purpose-specific HMAC binding of the exact body, including the submitted
password and current access token. It stores neither value. A retry must reconstruct the same body and envelope.
A changed password, changed session token, unavailable original service key or expired five-minute protocol envelope
cannot create a replacement attempt. The UI asks the user to keep the page open, retry with the same password and
contact support if uncertainty persists. Only Website's durable observed-success proof can resume lifecycle work;
an unknown provider outcome never authorizes another password writer. Website's process-crash and reconciliation
limits remain authoritative. A lost Dashboard response can also prevent receipt of its new signed retry state.
These limits require operational verification before hosted activation.

Temporary callback/completion responses apply all Supabase cookie mutations and return CSRF bound to the resulting
cookies. The user can retry from the current page after the token establishes a session. All auth responses remain
private and `no-store`; action references, token hashes, credentials and provider details stay outside UI responses
and logs. Callback redirects and auth JSON responses use `no-referrer`.

`AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON` is optional startup configuration so unavailable auth-action integration does
not break existing login or business reads. Auth-action calls fail closed when it is absent or malformed. Its strict
server-only object contains `environment` and a nonempty `service` array of unique versions and secrets of at least
32 characters, current key first. Reference rings and extra properties are rejected. Preview and Production must
match `VERCEL_ENV` and their already validated exact Payload origins; local and unit runtimes use `local` and `test`.
Keep prior service keys through the five-minute exact retry window. Recovery transport additionally requires
`VERCEL=1`, a deployed environment and one valid IP from `x-vercel-forwarded-for`. Other forwarding headers, local
addresses and caller-supplied IP fields never provide a fallback. This follows the [Vercel request-header contract](https://vercel.com/docs/headers/request-headers).
Missing original-IP authority, ineligible accounts and upstream failures all retain the neutral recovery response.

Offline route and wire-contract tests cover HMAC authentication, closed response validation, GET/POST separation,
subject/flow binding, CSRF renewal, fixed routes, confirmation retry and immutable completion retry. Controlled
Storybook/browser evidence covers invitation, recovery, password completion and safe failures without real provider
effects. This establishes source behavior only. No hosted credentials, callback binding, live database execution,
mail delivery, Preview acceptance or Production activation is established by this change.

### Personal group invitation and activation

An authorized Website back-office operator opens an existing Clinic Group and uses **Invite a personal group
manager**. The control sends `POST /api/clinicGroups/:id/personal-invitation` with only `email`, `firstName`, and
`lastName`. The persisted admin/support role authorizes the operation. This native Admin command is not a Dashboard
browser API and does not confer Payload Admin access.

Website reserves one pending personal principal and immutable operator/group origin before any provider effect.
Repeated preparation reconciles that same onboarding identity; an unknown provider result remains unconfirmed and
retryable. Existing local staff, reassignment, reactivation, revocation, and offboarding use their separate workflows.
An approved synchronized group assignment grants no Dashboard access before trusted personal activation.

Delivery uses the existing Website-owned `clinic-invitation` Auth action, signed cross-app protocol, replay handling,
password-completion claim, and environment activation registry. Preparation does not activate delivery. An inactive
environment returns an explicit inactive-delivery result to the operator; no direct provider invitation bypass exists.
The existing Dashboard confirmation/password journey clears its completion grant and returns to login. A subsequent
login obtains a fresh `clinic-scope-v1` bootstrap. Current eligible group clinics open through that response; an empty
set stays on the restricted workspace. Neither the invitation nor a bootstrap snapshot supplies a later grant.

The client-handled login, reset-request, and password-completion forms declare native POST submission so inputs do
not enter navigation URLs before hydration. Hydrated requests retain the established JSON, origin, CSRF, session,
and signed Auth protocol behavior.

Website records `group-initial-password` evidence only after the completed identity-bound action and a fresh
server-verified password event. The immutable proof binds principal, subject, original group, and Auth action; it
contains no clinic-origin claim. The same protected update establishes `identity-v1` readiness. Current approval,
identity synchronization, original invitation binding, and assignment are checked again before persistence. Existing
clinic-origin completion evidence and its guards retain their established semantics.

## CSRF and Origin Contract

Every authenticated state-changing Route Handler composes one central mutation guard. Route implementations cannot
replace or partially reproduce the guard. The guard:

1. requires the browser `Origin` to equal the request URL origin and belong to the environment-scoped trusted Dashboard
   origin set;
2. rejects missing, malformed, cross-host, or untrusted browser origins;
3. validates a stateless HMAC-signed CSRF token from a host-bound cookie against the request header using timing-safe
   comparisons;
4. binds the HMAC to the current validated Supabase session plus a random nonce, so a token from another session is
   rejected;
5. in deployed environments requires `Secure`, `Path=/`, and no `Domain` attribute;
6. validates content type and request schema before any upstream call; and
7. derives principal, clinic, and actor from the authenticated Payload result.

Local development and Production each trust only their configured exact origin. Preview additionally trusts the
validated current Vercel deployment URL and exact `https://clinics.preview.findmydoc.eu`. Preview deployment
metadata must match `clinic-dashboard-*-findmydoc.vercel.app`; the application does not accept a generic Vercel
wildcard. Host-only cookies intentionally prevent sessions and completion state from moving between preview hosts.

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

Payload provider adapters receive an access token only from the current server session. They use REST resources and
focused custom endpoints from the paired website architecture. The first custom contract is the self-and-capability
bootstrap.

For each environment, the client accepts one exact HTTPS Payload origin and configures authenticated fetches to reject
redirects. An origin mismatch, non-HTTPS target, or cross-environment URL fails before the first token-bearing request.
A redirect response fails without sending the Bearer token to the redirect target.

The person-scoped bootstrap uses `X-Findmydoc-Clinic-Scope-Contract: clinic-scope-v1` and mirrors that
version in `schemaVersion`. The server-only contract module also retains the independent inquiry and notification
negotiation headers. The bootstrap parser accepts only the new shape. Sessions identify a person; each source request
rechecks current authorization.

```ts
type ClinicDashboardCapability =
  | "clinic-profile:view"
  | "clinic-profile:edit"
  | "clinic-gallery:view"
  | "clinic-gallery:edit"
  | "clinic-treatments:view"
  | "clinic-treatments:edit"
  | "clinic-inquiries:view"
  | "clinic-inquiries:edit"

type ClinicDashboardBootstrapDTO = {
  schemaVersion: "clinic-scope-v1"
  principal: { id: string; displayName: string; email: string }
  status: "approved"
  clinics: { id: string; name: string; capabilities: ClinicDashboardCapability[] }[]
}
```

Website derives eligible clinics from current assignments, sorts by display name and then stable ID, and returns an
empty array when an otherwise eligible person has no authorized clinics. Each clinic's capabilities use the independent,
unique subsets of the closed union above. Reporting, doctors and reviews gain no invented bootstrap capabilities.
Their source operation authorization remains separate.

The initial page reads the fresh bootstrap and validates the host-only `fmd-clinic-preference` cookie against the current
principal and authorized list. The cookie stores only a principal ID and clinic ID; it contains no session or draft data,
and never grants access. Hosts separate Preview and Production preferences. A missing preference selects the first
clinic. An unavailable previous clinic selects the first entry with an explanation; an explicit unauthorized path stays
restricted. Zero clinics restrict the workspace. One clinic has no active switching control.

Authorized pages use `/clinics/{clinicId}?section={section}`. A manual change passes through the existing shared editor
departure guard and retains the current section. Committing the new context remounts clinic-scoped state and clears old
requests and editor work. Reporting uses `/api/dashboard/clinics/{clinicId}/reporting?periodDays=...` and
`/api/clinic-dashboard/clinics/{clinicId}/reporting?periodDays=...` upstream. Both reads recheck the target; the old targetless
reporting route denies access. Confirmed clinic-access loss immediately removes clinic content and actions. The same valid
personal session requests fresh choices from the existing private bootstrap BFF. Recovery never selects an alternative
automatically during active use, including when exactly one alternative exists. No alternatives keep the workspace
restricted. A temporary choices outage permits retry without restoring denied content or ending the session. Unverified
or malformed authentication failures count as unavailable; a verified session loss uses the existing session recovery.
Live CSV exports remain unavailable.

The parent Workspace retains the shared editor departure guard while inaccessible child editors unmount. Its `access-loss`
intent captures actual unfinished values and owned attachment references in opaque, editor-owned memory capsules. These
capsules never enter the recovery view model, URLs, browser storage, telemetry, logs or responses. Declining discard keeps
the old work privately protected and leaves the user restricted. Confirming discard invokes each captured original clinic
controller's cleanup before opening an explicitly chosen clinic in the same section. It does not save an old draft to the
destination. Cleanup failure retains protection for an explicit retry. Principal/session changes release the private work
and run original cleanup; obsolete choice reads, domain reads and actions cannot restore old content or navigate a new
scope. Existing unmounted-domain cleanup owns late upload completion. No new revocation channel or age policy is added.

`workspace/model/clinic-scope-conversions.ts` keeps gallery, doctors
closed until their independent target-route conversions are integrated. The server does not load their source records, and
the live workspace does not display another clinic's demo data. Targetless legacy domain routes deny access. This gate
records implementation scope, not Preview or Production availability. Existing isolated editor and Storybook fixtures remain
available for local behavior verification.

The bootstrap client rejects a response that does not match the expected DTO. It never forwards raw Payload documents,
Supabase identifiers, tokens, internal roles, permission internals, or unapproved clinic fields to Client Components.

Inquiry browser and Payload requests carry the selected clinic in the path. The request-local provider
retains that clinic through reply, note, lifecycle, read-position, contact, draft, upload, cleanup and appeal
operations. Protected attachment previews and downloads use the same target. Website checks current
stored authority and each source relationship independently of the browser selection. Existing operation
permissions and legal restrictions remain unchanged. Clinic-scoped controllers remount on committed
switches and reject obsolete responses; unfinished replies, notes and uploads use the shared departure gate.
Exact inquiry opening does not depend on the currently loaded queue page. Controlled browser evidence
covers local behavior and does not establish Preview or Production acceptance.

The patient-inquiry domain uses one private `PatientInquiryProvider` for both `loadQueue()` and
`changeStatus({ inquiryId, status })`. Its Payload adapter owns the current-record read, transition validation, and
status write; the browser and Route Handler do not observe that sequence. The adapter validates website responses and
projects only the approved inquiry fields. Its Controlled implementation is selected by the existing local test mode,
uses the same provider contract, and is impossible to enable in Preview or Production. No Payload failure selects
Controlled data.

`submitAppeal({ caseId, text })` uses the existing Website `POST /api/clinic-dashboard/clinics/{clinicId}/inquiries/appeal`
contract with the ordinary server-side clinic Bearer and inquiry-v2 header. The BFF returns only the validated
`201 { submitted: true }` receipt. Text must be nonblank and at most 1,000 characters; its submitted whitespace
is retained. Website owns participation, the current measure, and the one-time appeal predicate. Its eight closed
`MODERATION_*` failures map to sanitized BFF errors with the same status, including `409 invalid-state` for an
unavailable or already submitted appeal. Neither the provider nor BFF retries the business request after failure or
uncertainty. Controlled providers have no appealable cases and fail closed with `invalid-state` rather than fabricate
a successful appeal. Offline BFF tests exercise the normal session/provider composition with only external Supabase
and Website boundaries replaced. This source wiring does not establish deployed availability or mail delivery.

The clinic-treatment domain uses one private `ClinicTreatmentProvider` for `loadTreatments()`, `createTreatment()`, and
`updateTreatment()`. Its Payload adapter targets only the focused `GET`, `POST`, and `PATCH`
`/api/clinic-dashboard/clinics/{clinicId}/treatments` contract with exactly one `X-Findmydoc-Clinic-Scope-Contract: clinic-scope-v1` header. The Website endpoint checks the current principal against that explicit clinic target,
returns plain-text central treatment descriptions, creates offerings inactive, and permits updates only to the EUR
price and active status after an optimistic revision check. Browser code uses the same-origin BFF with private no-store
responses and fixes the clinic identifier in every request path. Bodies cannot select another clinic.

The Dashboard snapshot maps Website `priceEUR` to the UI's fixed-EUR `price` field and preserves each ISO `revision`.
Create sends only `{ treatmentId, priceEUR }`. Update sends `{ offeringId, expectedRevision, priceEUR, active }`; stale
revisions and serializable update conflicts map to `409 CLINIC_TREATMENT_CONFLICT`, reload the latest offering, and keep the dialog open so the user can
review and resubmit unsaved values. The adapter validates the focused DTO and never depends on generic Payload
collection paths, query grammar, depth, relationship expansion, or collection response envelopes.

Treatment editing stays under the existing Profile destination. Its independent conversion gate can show the treatment workspace while other profile domains remain closed. A native editor includes the existing clinic-switch intent so it works while the outer header is inert. The same shared departure guard offers keep editing, save for the original clinic and continue, or explicit discard. A failed save keeps the editor and destination unchanged. Deactivation remains an `active: false` update; no catalogue management or deletion operation is introduced.

Before a source 401/403 can hide the editor, the treatment browser adapter invokes the existing scope-bound recovery callback. The editor supplies its actual private treatment, price and availability draft to the existing access-loss capsule. Unmounted or replaced controllers ignore delayed results and cannot refresh, mutate or navigate a different clinic. Principal/session cleanup and discard remain owned by the shared guard. These source and controlled-browser checks do not establish deployed Preview or Production availability.

The clinic-gallery domain uses one private `ClinicGalleryProvider` for snapshot reads, one-file draft uploads,
atomic ordered saves, draft discard, and authorized image streaming. Its Payload adapter targets only the focused
`/api/clinic-dashboard/gallery`, `/media`, and `/discard` contracts. The Website derives the clinic from the approved
principal and returns `{ items, revision, constraints }`; the first ordered item is the public main image. Save sends
only `{ expectedRevision, items: [{ mediaId, alt, captionText? }] }` and maps a stale revision to
`409 CLINIC_GALLERY_CONFLICT` while preserving local editor state.

The browser may upload at most three files concurrently, one file per request, within the returned 12-item, 4 MiB,
50 MP, and MIME constraints. Uploaded drafts remain private until save. Dashboard media responses replace every
upstream file URL with `/api/dashboard/gallery/image` plus an authenticated-encryption token that keeps the upstream
origin and path opaque. That endpoint re-authorizes the session and capability, opens the token server-side, and lets
the Payload adapter accept only the configured Payload origin and `/api/clinicMedia/file/**` path. Gallery responses
and image streams remain private and `no-store`. Browser code never receives a Bearer token, a direct upstream media
URL, or performs a cross-origin Payload request.

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

Patient-inquiry providers return only closed domain errors. Queue failures map to the existing
`temporarily-unavailable` UI state. The status route maps `not-found` to `404 INQUIRY_NOT_FOUND`, `conflict` to
`409 INQUIRY_STATUS_CONFLICT`, and an unavailable or malformed upstream response to
`503 INQUIRY_SERVICE_UNAVAILABLE`. Existing session, access, origin, CSRF, input, and private-cache responses are
unchanged.

## Environment Contract

| Environment          | Trusted Dashboard origins                                                       | Supabase   | Payload API                          | Allowed callback origins                                       |
| -------------------- | ------------------------------------------------------------------------------- | ---------- | ------------------------------------ | -------------------------------------------------------------- |
| Local                | Exact `http://localhost:3000`                                                   | Staging    | Exact `https://preview.findmydoc.eu` | Exact local callback                                           |
| Pull-request preview | Exact validated current `VERCEL_URL` and configured stable origin               | Staging    | Exact `https://preview.findmydoc.eu` | Generated Vercel Preview host and stable callback              |
| Main preview         | Exact `https://clinics.preview.findmydoc.eu` and validated current `VERCEL_URL` | Staging    | Exact `https://preview.findmydoc.eu` | Stable Main Preview callback and generated deployment callback |
| Production           | Exact `https://clinics.findmydoc.eu`                                            | Production | Exact `https://findmydoc.eu`         | Exact Production callback                                      |

The environment contract validates `SUPABASE_URL`, `EXPECTED_SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`,
`PAYLOAD_API_URL`, the expected Dashboard origin, and the server-only `CSRF_SIGNING_SECRET` as one bundle. `SUPABASE_URL`
must equal `https://<EXPECTED_SUPABASE_PROJECT_REF>.supabase.co` with no alternate host, path, credentials, query, or
fragment. No service-role key is accepted. `PAYLOAD_API_URL` must equal the exact environment origin in the table; HTTPS
and redirect rejection are mandatory. `VERCEL_URL` is optional server-only deployment metadata. When present in
Preview, it must contain only a deployment hostname matching the expected project and team shape; missing or invalid
metadata never broadens the trusted set. The stable Preview origin remains valid only for deployments built with the
matching Preview environment bundle.

## Cache Contract

Session, principal, clinic, capability, and authenticated Dashboard reads are `private-live`. Protected Route Handlers
and pages opt out of ISR, shared caches, durable Dashboard caches, and Vercel Data Cache storage. Request-local
deduplication during one server render is allowed.

When an authorized Dashboard command changes data rendered on the public website, Payload still executes the existing
public revalidation contract for the affected surfaces. The private BFF response does not suppress, replace, or defer
that invalidation. Transactional treatment updates trigger the existing plan only after commit. This architecture
introduces no new cache class, tag family, owner, or event.

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
- Run the same patient-inquiry provider contract against Controlled and Payload implementations, including queue shape,
  allowed changes, unknown IDs, and conflicting transitions.
- Run the clinic-treatment provider contract against Controlled and Payload implementations, including request-scoped
  persistence, tenant isolation, inactive creation, duplicate assignment, EUR validation, optimistic update conflicts,
  and private/no-store response semantics.
- Run the clinic-gallery provider contract against Controlled and Payload implementations, including revision
  conflicts, ordered main-image semantics, upload limits, three-request concurrency, draft discard, tenant isolation,
  exact media-proxy origin/path validation, and private/no-store response semantics.
- Verify composition selects Controlled only in local test mode, selects Payload otherwise, rejects missing tokens, and
  fails closed in Preview and Production.
- Verify architecture process fixtures reject concrete providers, private provider contracts, or mode selection in UI,
  App Router, Storybook, and unrelated tests.
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
- A claim of Preview or Production capability availability based only on provider wiring or local fixtures.

### Notification foundation

Review publication, withdrawal and removal occurrences use the same closed notification contract. The review domain owns ordinary exact loading through GET `/api/dashboard/clinics/:clinicId/reviews/:id`; its Payload provider validates the Website's minimized `{ data }` response and loads only normal currently authorized workflows within one shared eight-second budget. Closed literal cases are identical in both repositories. A selected review appears in a separate detail panel while its filter selection remains unchanged. Fresh authorized detail replaces the matching retained list card, and an unavailable target removes it. Older list responses cannot restore hidden content. Summary and pagination totals require a normal refresh after such a replacement. Native scalar treatment relationships are resolved through the same closed exact review contract for list cards, summary and filter options, with deduplicated reads in batches of at most ten under one eight-second budget. Each opening has a distinct request identity, and the review domain confirms only the committed visible exact detail and semantic focus. Notifications then marks the original represented member IDs separately. Failed, cancelled, unavailable or obsolete openings create no automatic receipt. Current hidden text and author fields never fall back to versions or notification history. Withdrawn and removed cards omit the approval badge so their current visibility remains clear. Response and appeal actions still follow the ordinary Website approved-status and owning-clinic rules. Preview and Production review-notification qualification remain open.

Normal-mode notification reads use the authorized Website contract through the personal domain provider and GET `/api/notifications`. The feed spans the current person’s eligible clinics and is independent of the active Dashboard clinic. Each occurrence or complete message group carries one strict `clinic: { id, name }` attribution with the current clinic name; groups never cross a clinic or inquiry. Website applies current visibility and expiry before grouping, ordering, pagination and the complete unread count. Signed continuations bind to the person, view and version rather than the active clinic. Switching clinics remounts the center, clears loaded rows and count, aborts obsolete reads, and reloads that personal feed. Foreign-clinic exact opening remains unavailable until the separate cross-clinic destination slice; explicit marking is available for visible entries from every eligible clinic. SSR loads the complete personal unread summary. Each visible, online tab polls every 30 seconds: the closed center reads the summary, while an open center reloads its selected view through the previously loaded extent. Opening, view switching, visibility and connectivity recovery, and confirmed marking request immediate reads. A complete refresh has one eight-second budget and replaces loaded rows only after every page succeeds. The client schedules long expiry waits in browser-safe chunks without changing any absolute deadline. It hides individual members at their 90-day deadlines, requests the full count at `nextUnreadCountChangeAt`, and never displays an expired count as zero. Transient failures retain visibly stale, unexpired permitted rows and retry after 5, 10, 20, then 30 seconds while honoring Retry-After; known access loss clears the scope. Reads are private, session-bound and byte-bounded. No demo fallback or browser read-ID persistence remains in the live workspace.

The additive `X-Findmydoc-Clinic-Notifications-Contract: clinic-notifications-v1` request header is negotiated together with `X-Findmydoc-Clinic-Scope-Contract: clinic-scope-v1`; it leaves the inquiry domain protocol unchanged. Support negotiation is distinct from capture activation. The complete approved source catalogue, authorized reads, personal message groups, exact inquiry and review opening, individual and displayed-entry marking, cursor history, and local refresh recovery are implemented. POST `/api/notifications/read` forwards a fixed complete selection through the guarded BFF; the Website owns atomic receipts and first read timestamps. A fixed selection may span clinics. The source rechecks current eligibility under the authorization barriers and preserves personal receipts across reassignment and return. Receipt decision time, first read timestamps and unknown write outcomes retain their existing semantics. The UI distinguishes confirmed marking, proven non-commit, unknown write outcome and failed refresh after confirmation. Capture remains inactive outside isolated acceptance. Local validation does not establish Preview or Production availability.

## Clinic-scoped review management

The review browser commands bind list filters, pagination, exact detail, history, response and appeal submission to `/api/dashboard/clinics/:clinicId/reviews`. The BFF resolves the explicit target against fresh personal access and keeps session, origin and CSRF checks. Targetless legacy routes remain denied. The Payload provider uses only the dedicated Website review operations under the matching clinic prefix and negotiates `clinic-scope-v1`; mutation bodies cannot choose a clinic. No additional bootstrap capability names are introduced.

The workspace enables the reviews conversion gate. A clinic switch preserves the reviews section, remounts clinic-owned state and creates new commands for the new target. Existing departure continuations preserve unfinished response and appeal drafts. Review confirmation and editor dialogs both use the native top layer so Keep editing, Escape and save/discard controls remain reachable and restore nested focus. Controlled acceptance uses distinguishable synthetic clinic records and cannot qualify real Preview or Production source behavior.

## Explicit clinic profile operations

Profile snapshot, draft create/save/discard and publication use `/api/dashboard/clinics/:clinicId/profile` and its draft/publish children. The BFF repeats current target access and operation capability checks and binds its private provider to that authorized target. Browser and source providers retain this target for pending actions and reconciliation reads. Payload requests include one literal `clinic-scope-v1` header. Editable bodies cannot choose clinic, country, coordinates or unrelated controlled fields. Türkiye city options come from the authorized profile snapshot.

Controlled profile state is separate per clinic. The profile controller drops responses after its editor unmounts and does not issue a second save after a late create. Source 401/403 invokes the Workspace recovery callback before command rejection. The shared departure guard can retain the actual private draft, saved baseline and unresolved publication attempt before the editor disappears. Failed saves block departure; only explicit discard releases protected work. The profile conversion gate leaves treatments, doctors and gallery under their independent gates.
