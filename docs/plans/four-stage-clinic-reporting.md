# Four-stage clinic reporting

Approved implementation plan, 6 November 2026. Website owns the reporting producer and source calculations;
Clinic Dashboard owns the session, BFF and both reporting views. The source baselines are Website `40a60e5d` and
Dashboard `e1a79d9a`. Implementation uses isolated worktrees to preserve unrelated work.

## Outcome and scope

Authorized clinic staff see Impressions, Profile views, Unique visitors and Inquiries in this order, in the regular
Dashboard and synthetic demo. Remove Inquiry starters from reporting calculations, coverage, contracts, validation,
selection, details, summaries and demo data. Keep the existing Website form-side PostHog capture and privacy checks.
The upper profile-completion card and four placeholders belong to a separate deliverable.

## Access and data

Keep authorized private BFF reads, private no-store responses and source-specific failures. No public route, source
credential, database, persistent aggregate, shared cache or personal identifier is introduced. Saved display preferences
contain only their principal/clinic scope, valid period and selected stage. Historical PostHog events remain intact.
Cache impact is `no-public-impact`; public reads and invalidation ownership do not change.

## Contract and UI

Both applications use `clinic-dashboard-reporting-v3` with four count metrics and independent reviews. V2 is rejected
without a compatibility branch. Both existing funnel components use four desktop columns and vertical mobile order.
The new visitor-to-inquiry explanation describes independently measured populations rather than a conversion rate.
A stored `inquiryStarters` choice falls back to `profileViews` in its valid original scope and period.

## Acceptance and delivery

Use the approved source-query, API/BFF and full-screen interaction test boundaries. Execute the emitted query against
synthetic ClickHouse rows. Validate V3 and reject missing/extra fields and V2 responses. Run retained form-capture,
consent, privacy and submission tests. Verify stage selection, legacy preference restoration, period changes, reloads,
late clinic responses, zero/coverage/outage states, keyboard and touch. Inspect both views at 320/390/1440 pixels in
light and dark themes. Run relevant tests, checks, application builds and Dashboard Storybook build.

Website ADR 040 replaces ADR 029. Update current API, analytics and frontend guides without rewriting closed specs.
Prepare paired PRs before delivery. The later coordinated platform release deploys Website then Dashboard; the interval
can interrupt reporting and old browser documents may need a reload. Rollback uses a matching V2 pair. Deployment,
external PostHog insight changes and historical event deletion are excluded. AI reviewers require separate confirmation.
