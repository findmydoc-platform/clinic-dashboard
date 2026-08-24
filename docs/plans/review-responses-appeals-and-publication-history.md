# Review Responses, Appeals, and Publication History

## Outcome

Authenticated clinic staff can inspect the approved reviews assigned to their server-derived clinic,
filter and page through them, submit or revise a clinic response for moderation, submit the one allowed
appeal, and inspect public-measure, withdrawal, response, appeal, and safe history states. The existing
Reviews destination becomes source-backed and no longer presents local workflow mutations as product
behavior.

## Audience, Access, and Data

- The audience is authenticated clinic staff whose approved bootstrap resolves one assigned clinic.
- Payload remains the source of truth. The dashboard uses the verified session access token only on the
  server and never adds direct database access or service-role credentials.
- The browser never selects a clinic. Review IDs are accepted only as resource locators; Website access
  rules and the dashboard provider both fail closed when a review is not an approved review of the
  assigned clinic.
- The feature is private. Every dashboard BFF response uses `private, no-store`, varies by the session,
  and never adds a public route.
- Review text, rating, public author projection, public measure, and factual public notice are public
  review data when the Website contract permits them. Pending responses, moderation reasons, appeals,
  decisions, actor types, and workflow versions are private clinic-owned or platform audit data.
- The dashboard stores no review data. Browser state contains only the current fetched snapshot, filters,
  dialog state, and opaque pagination cursors for the active session.
- Raw patient relations, platform actor relations, internal moderation reasons, raw native Review
  versions, original removed text, and original withdrawn text never enter dashboard DTOs.

## Website Contracts

The implementation consumes the completed Website review contracts:

1. `reviews` exposes approved clinic-scoped reads, public measures `none`, `context`, `redaction`,
   `placeholder`, and `removed`, plus `active` and `withdrawn` withdrawal states.
2. `reviewResponses` exposes one clinic-scoped response workflow per review. Clinic staff may create a
   pending response or replace the current pending version. Platform moderation owns `pending`,
   `approved`, `rejected`, and `blocked` outcomes.
3. `reviewAppeals` exposes one immutable clinic appeal per review with reasons `incorrect_clinic`,
   `inappropriate_content`, `privacy_concern`, and `other`. Platform staff own `submitted`,
   `under_review`, `upheld`, and `dismissed` transitions.
4. `GET /api/reviews/<reviewId>/publication-history` is the only Review-history source available to
   clinic staff. It uses keyset pagination and an opaque cursor; `409 HISTORY_CHANGED` invalidates every
   accumulated page.
5. Native `reviewResponses` and `reviewAppeals` versions are readable only through their tenant-scoped
   version access. The dashboard projects only non-personal actor types and workflow-safe fields.

The Website bootstrap currently has no review-specific capability. Approved clinic staff receive the
review workflow through Website collection access, so dashboard review routes require an approved
clinic session rather than inventing a local capability that the source does not issue.

## Dashboard BFF Contract

The review domain owns one private provider and the following same-origin routes:

- `GET /api/dashboard/reviews` loads a server-filtered, page-number-paginated clinic review list plus the
  full clinic rating summary and treatment filter options.
- `POST /api/dashboard/reviews/<reviewId>/response` submits the first pending response or replaces the
  current pending response.
- `POST /api/dashboard/reviews/<reviewId>/appeal` submits the single immutable appeal.
- `GET /api/dashboard/reviews/<reviewId>/history` loads one sanitized publication-history page and the
  accessible response and appeal workflow histories.

List query input is restricted to page, period, rating, treatment ID, and review visibility. Visibility
filters are `all`, `published`, `moderated`, `removed`, and `withdrawn`; they map only to the independent
`publicMeasure` and `withdrawalState` fields and do not recreate the obsolete composite `Open`,
`Answered`, or `Under review` state.

Mutations require the existing exact-origin, session-bound CSRF contract before route access or request
parsing. JSON bodies have a fixed byte limit and strict schemas. BFF results map invalid input,
unauthorized, forbidden, hidden/not-found, conflict, invalid upstream data, and upstream timeout to
`400`, `401`, `403`, `404`, `409`, `502`, and `504` without confirming a foreign review's existence.

The server provider validates every upstream response, requests every Website read with `no-store`, and
uses short request timeouts. The dashboard BFF enforces private response headers and requests `depth=0`
unless a named treatment projection is required. Initial
page loading and later browser requests use the same provider contract. Controlled auth uses a
deterministic provider aligned with the Website demo review, response, appeal, moderation, and
withdrawal states.

## UI and Components

The Reviews screen remains a compact `content-evidence` operational surface. Existing `PageHeading`,
`Card`, `RatingStars`, `Button`, `Field`, `Select`, `Textarea`, and `Modal` primitives remain the visual
foundation; no design-system token or shared primitive change is planned.

Each review card has four independent visual groups:

1. Rating, public author projection, treatment, date, and the safe current review projection.
2. Public measure or withdrawal context using restrained inline guidance rather than a universal status
   pill. Removed and withdrawn states render no original or historical review text.
3. Clinic response projection showing the current published response, an optional pending revision, and
   `pending`, `approved`, `rejected`, or `blocked` moderation context.
4. Appeal projection showing the submitted reason and details, current status, and read-only decision
   reason and timestamp when present.

Primary actions are contextual: `Respond` or `Edit pending response`, one `Submit appeal` action only
when no appeal exists, and `View history`. Internal notes, response locks, platform moderation actions,
withdrawal actions, appeal decisions, restore, and delete actions are removed.

The response dialog explains that the response is submitted for platform moderation and that an already
published response stays visible until a replacement is approved. The appeal dialog explains that the
appeal is submitted once and cannot be edited. The history dialog separates publication history,
response history, and appeal history, supports `Load older history`, restarts after
`HISTORY_CHANGED`, and never exposes a platform mutation.

The screen provides explicit initial-unavailable, loading, empty-filter, refresh-error, mutation-error,
and history-error states. Async state changes are announced, dialogs restore focus, and no state relies on
color alone. Mobile keeps one-column cards and full-width primary actions; desktop may align secondary
actions and metadata horizontally. Light and dark mode use the existing semantic tokens.

## Storybook State Matrix

Deterministic stories cover:

- unchanged public review without workflows;
- context notice, redaction, placeholder, removed, and withdrawn review projections;
- published response, pending first response, published response with pending replacement, rejected
  replacement with published response retained, and blocked response;
- appeals in submitted, under-review, upheld, and dismissed states;
- response submission and pending-response editing;
- appeal validation and immutable-submission guidance;
- publication, response, and appeal history, including pagination and history restart;
- unavailable, loading, empty, refresh failure, and mutation failure;
- 320px narrow/short viewport, desktop, light mode, and dark mode.

## Test and Acceptance Plan

- Unit tests cover DTO validation, safe review-text projection, filter query mapping, independent workflow
  states, history restart, reducer/controller transitions, and error mapping.
- Provider tests cover exact Website paths and queries, authorization headers, no-store reads,
  clinic-scoped not-found behavior, response create/update selection, one-appeal conflict, response and
  appeal version minimization, invalid upstream data, and request timeout.
- Route tests cover approved-session access, CSRF for both mutations, body limits, strict input,
  `private, no-store`, tenant-safe `404`, and the required `400`/`401`/`403`/`404`/`409`/`502`/`504`
  responses.
- Storybook browser tests own card states, forms, history pagination, focus, keyboard operation,
  responsive behavior, and accessibility.
- Focused Playwright coverage proves load, filter/page, response submission, appeal submission, and
  history pagination through a controlled authenticated session.
- Final validation runs formatting, `pnpm check`, relevant unit and integration tests, Storybook browser
  tests, Storybook build, application build, and the focused E2E flow.

## Delivery and Risks

- The feature is delivered from a branch based on the current `origin/main`; deployment configuration is
  unchanged.
- Website and dashboard DTO drift is the main integration risk. Strict schemas and provider contract
  tests fail visibly instead of falling back to fixtures.
- List assembly joins three Website collections. Review pagination remains authoritative from the Review
  collection; response and appeal queries are limited to review IDs on the current page.
- The rating summary requires clinic-wide approved review ratings. The provider reads them in bounded
  Website pages and derives the aggregate without exposing raw records to the browser.
- Publication-history cursors are opaque and never decoded or edited by the dashboard. A history change
  clears accumulated publication entries before the first page is requested again.
- Existing demo location selection remains untouched. Source-backed reviews always represent the one
  authenticated clinic and therefore do not switch with demo locations.

## Out of Scope

- Review moderation, author withdrawal, withdrawal correction, appeal decisions, or response moderation
  from the Clinic Dashboard.
- Editing or deleting a patient review, response, or submitted appeal.
- Raw native Review versions, patient relations, named actor snapshots, or internal moderation records.
- Internal clinic notes, support tickets, notifications, exports, analytics, email, or push delivery.
- Dashboard-owned persistence, direct Payload browser access, database access, or service-role secrets.
- Changes to the location selector, deployment configuration, Website schema, or Website workflow logic.
- A new design direction, new design tokens, or Product Design exploration.
