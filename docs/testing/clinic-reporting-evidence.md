# Clinic reporting evidence

Ticket [#305](https://github.com/findmydoc-platform/clinic-dashboard/issues/305) remains open. Controlled tests cover
the five-count implementation. Deployed capture, source configuration, coordinated rollout and targeted historical
deletion still need operational evidence. No deployment, external capture, analytics mutation or deletion took place.
The parent specification #299, gap #298 and product PRD remain unchanged.

The companion [Website cleanup inventory and release order](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/docs/integrations/clinic-reporting-cleanup.md)
records actual consumers, retained data and the inspected PostHog project. Cross-repository links target the companion
integration branch and require publication of that branch.

## Acceptance evidence

The row numbers follow #305's acceptance criteria. A controlled result does not establish deployed availability or deletion.

| AC                                      | Evidence                                                                                                                                                                                                                                                              | Delivery state                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Concrete deletion inventory          | Website inventory lists the retired CTA/server inquiry events, request-time calculations, V1 contract, session transport, consumers and retained profile/operational data. Its aggregate preview bounds the inspected project and time window.                        | Source and inspected-project inventory available. A fresh fixed-cutoff preview in the intended deletion project is still required.                     |
| 2. Targeted historical removal          | No stored reporting aggregate, Reporting collection, scheduler or reporting migration exists. Retired raw events do exist in the inspected window.                                                                                                                    | Open. No supported event-only deletion capability or execution evidence.                                                                               |
| 3. Preserve shared and operational data | Website service/query tests retain profile events, nonspam inquiry counts and reviews. Inquiry route/endpoint tests retain persistence, idempotency and authorization.                                                                                                | Controlled preservation verified. Repeat against the approved project after deletion.                                                                  |
| 4. Before/after proof                   | The inventory records aggregate counts before cleanup. The execution record below requires identical bounded predicates before and after.                                                                                                                             | Open. No deletion or after-result exists. Removing source queries is not deletion proof.                                                               |
| 5. Real capture and source history      | Installed-SDK tests and exact-query execution cover controlled capture and aggregation. Capture-start and retention rules remain conservative.                                                                                                                        | Open. Record deployed query project/settings, authorized ingestion and verified capture starts. Full 90-day history need not be fabricated or awaited. |
| 6. Complete five-card page              | The full-page flow below checks exact order, every detail, initial Profile Views, Public profile completion and four placeholders. V2 contract tests reject retired fields.                                                                                           | Controlled evidence available.                                                                                                                         |
| 7. State, selection and access          | The reporting E2E file covers 7/30/90 days, section/reload persistence, old Contacts fallback, delayed old-clinic responses, partial history, source failure, independent Payload facts, keyboard and touch. Existing page/stories cover 1440/390/320 in both themes. | Controlled Chromium evidence available. Native final-checkpoint repeat and real Next/Payload prefetch remain separate prerequisites.                   |
| 8. Distinct evidence kinds              | This document separates controlled tests from the source/rollout and deletion records below.                                                                                                                                                                          | #305 stays open until those records are complete.                                                                                                      |
| 9. Three agreed boundaries              | The next table links each boundary and its limits. No product PRD or parent issue was rewritten or closed.                                                                                                                                                            | Controlled boundaries covered; explicit operational gaps remain.                                                                                       |

## Controlled test boundaries

Website test links below use the same companion integration branch as the inventory.

| Agreed boundary                         | Concrete evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | What it does not prove                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public Website to analytics output      | [Rendered form and installed SDK](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/posthog/inquiry-starts.test.tsx) cover guest and authenticated prefill, own invalid/cleared edits, in-form selects, consent changes, later edits and submission despite capture failure. [Native listing/SDK browser tests](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/posthog/listing-impressions.browser.test.ts) cover positive visible pixels, below-fold scroll, hidden/inactive windows, committed search/page identity, unopened page responses, consent, rejection retry, browser zoom and the closed payload for both new events.                                                                                                                                                                                                                                                                                                                                                                                                         | The browser composition substitutes Next navigation and supplies controlled result props. Actual Next/Payload/RSC prefetch and deployed ingestion are unverified.                                      |
| Website contract to Dashboard BFF       | Website [reporting service](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/features/clinicDashboard/reporting/service.test.ts), [production query](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/features/clinicDashboard/reporting/posthog-v2.test.ts), [impressions](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/features/clinicDashboard/reporting/impressions.test.ts), [inquiry starters](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/features/clinicDashboard/reporting/inquiry-starters.query.test.ts) and [retired-event noise](https://github.com/findmydoc-platform/website/blob/feature/299-clinic-reporting/tests/unit/features/clinicDashboard/reporting/retired-events.test.ts) tests run the exact emitted SQL over synthetic ClickHouse events. [Dashboard BFF tests](../../tests/integration/clinic-dashboard-reporting-route.test.ts) verify the closed V2 DTO, access, private headers and independent source states. | Synthetic aggregation and an accepted HogQL compiler probe do not prove credentials, clinic values, ingestion, coverage or rollout. Finished source numbers in page tests are display evidence only.   |
| Complete Dashboard page and interaction | [Clinic-scoped reporting E2E](../../tests/e2e/clinic-scope-reporting.spec.ts), especially `keeps the five-card flow and independent Payload facts through an analytics outage`, exercises all five selectable details and the final page under partial history/failure. The same file covers legacy preference migration, delayed clinic responses, section/reload/period selection and actual touch. [Workspace screenshots](../../tests/e2e/clinic-dashboard.spec.ts) and [overview browser stories](../../src/features/clinic-dashboard/dashboard/components/organisms/DashboardOverviewScreen.stories.tsx) cover both themes at 1440/390/320, bounded explanations, zero, missing comparison and independent profile/review/inquiry displays. [Demo stories](../../src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.stories.tsx) retain explicitly synthetic charts/export.                                                                                                                                                                                                                     | Controlled sessions/providers and normalized source responses do not establish Preview or Production availability. Chromium mobile emulation does not establish every mobile engine or browser chrome. |

The query fixtures distinguish visitors from sessions and inquiry IDs, repeat views/edits, separate clinics and apply
current/comparison boundaries for 7/30/90 days. They cover capture start, retention, missing browser identity, zero and
start-before/submit-inside behavior. The query keeps one three-second request without retry or stale fallback.

The private EU query host is fixed at `https://eu.posthog.com`; [PostHog's API documentation](https://posthog.com/docs/api)
distinguishes it from public ingestion. A failing exact outbound-URL assertion preceded that correction in the canonical
adapter test. SQL and browser ingestion did not change. Unauthenticated probes returned 403 at both hosts and do not
establish an authenticated runtime failure.

## Validation checkpoints

The #305 branch starts at Dashboard `62f46d66a545f1e7de435b1719d50033acc058f8` and Website
`56686dc1d0878afdb9df953365e42a593cea0fcb`. These include the integrated #300–#304 source.

- On the #305 source, four Website query files passed all 16 tests with the isolated synthetic ClickHouse fixture.
  The production query's URL assertion failed before the host correction and passed afterward.
- On the #305 source, the complete clinic-scoped reporting E2E file passed all 11 cases. The chart's three browser
  stories passed after correcting the obsolete singular `contact` expectation to `inquiry starter`. The existing
  workspace screenshot test passed after selecting the supported unavailable Unique Visitors card during an outage.
- At the preceding integrated Dashboard checkpoint, the coordinator passed all 1,595 unit/integration tests in
  127 files, the application build and Storybook build. The focused route-access mutation run killed all 58 selected
  mutants after 39 passing initial tests. This is authorization evidence, not a reporting mutation score.
- Final combined broad E2E, affected Storybook rerun, Storybook rebuild and both repository checks belong to the
  coordinator's delivery record. Their completion must be recorded from actual results, not inferred from earlier runs.

The native Website listing/SDK suite passed all 11 cases in an isolated run at Website checkpoint `133a6cc63`.
The production listing adapter, URL state, impression hook, template and card files are unchanged through the
Website base checkpoint above. Later integrated reruns failed the real active-document prerequisite because macOS
was locked. No new native capture proof resulted. A final-checkpoint repeat requires an unlocked desktop and must run
alone with native focus/visibility, without focus emulation or competing foreground automation.

The normal Website build previously compiled source and passed TypeScript, then failed static parameter collection
because the configured database was unreachable. The actual Next/Payload page and RSC prefetch path therefore remain
unverified. Replacing navigation in the controlled browser composition does not close that gap.

Screenshots use controlled data and remain ignored under `output/playwright/`. The reporting E2E creates
`302-inquiry-starters-{light,dark}-{1440,390,320}.png`, its bounded explanation images and the 320px touch image.
The combined outage flow creates `305-five-card-analytics-outage.png`. The existing workspace test creates both-theme
page and failure screenshots at all three widths. Review the actual images alongside the corresponding successful
test run; filenames alone are not a visual check.

## Source and rollout record still required

Record the environment, deployed Website/Dashboard revisions, reporting contract header, authorized clinic and query
project identity. Verify `POSTHOG_QUERY_API_KEY`, `POSTHOG_QUERY_PROJECT_ID`, `POSTHOG_QUERY_RETENTION_DAYS` and the three
capture-start settings through presence/configuration checks that disclose no credentials. Use verified UTC capture
start instants for profile views, impressions and inquiry starters. First observed activity does not establish
continuous capture. Missing starts remain partial, and unavailable configuration remains a source failure.

The cached local Website profile contains no reporting query credential, query project, retention or capture starts.
The inspected connected project is `findmydoc-preview` / `findmydoc` / `81797`; no deployed configuration currently
links it to application query credentials. New impression/start event names were absent from its observed taxonomy.

Follow the inventory's compatible-producer → V2-consumer → cleanup release order. Capture actual authorized profile
views, visible impressions and qualifying form edits with consent and verify privacy-safe aggregate output. Verify
guest/authenticated inquiry persistence without analytics and retained profile progress/reviews during an analytics
failure. Record capture acceptance and source results separately. Do not claim historical zero before capture start.

## Historical cleanup record still required

1. Obtain a supported event-only deletion mechanism and permission for the intended project. The connected tools
   expose no such operation. Person deletion would remove retained profile events. Event-definition deletion and
   shortening retention do not replace targeted raw-event removal.
2. Recheck actual consumers and confirm obsolete capture has stopped after the coordinated rollout. Fix the project,
   timezone-aware cutoff and event-only predicate from the inventory. Preview counts and first/last activity with that
   exact immutable selection. The earlier one-year inspection is context, not the approved deletion selection.
3. Present the mechanism, project, predicate, cutoff, affected counts, retained data and verification plan for separate
   explicit deletion approval. Do not add person/session predicates or select profile views, new events, SDK data,
   Payload inquiries, audit, permissions, idempotency, notifications or authentication records.
4. After approved execution, retain the provider's completion reference and rerun the identical bounded aggregate
   selection. Confirm selected raw events were removed according to the provider's completion guarantees. Recheck
   retained profile/new events, the authorized V2 source and independent Payload functions. Record any delayed physical
   deletion and repeat when the mechanism's documented completion condition is met.

No supported mechanism, approval, deletion execution or after-proof is available. These are concrete delivery
dependencies. Neither #305 nor its parent specification and gap may be marked complete on controlled test evidence.
