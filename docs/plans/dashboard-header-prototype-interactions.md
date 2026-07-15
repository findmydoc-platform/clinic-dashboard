# Dashboard and Header Prototype Interaction Plan

> **Planning record — 2026-07-15.** This is a deliberately narrow follow-up to the [Clinic Dashboard Prototype and Capability Visibility Plan](./clinic-dashboard-prototype-and-capability-visibility.md). It covers only the dashboard reporting period and header notifications.

## User Outcome and Audience

Clinic staff reviewing the prototype can switch between 7, 30, and 90 days and see a coherent, plausible dashboard for each period. They can also inspect a small local notification panel for new messages and reviews without mistaking either capability for live data.

The audience is internal product review and prototype walkthroughs. The default presentation remains unchanged: the full-interface switch is off for a new browser session, and the reporting control plus notification bell appear only when that switch is on.

## Scope

In scope:

- Dashboard metric cards, conversion funnel, profile-views chart, chart summary, and review activity for the selected reporting period.
- A local header notification center for new message and review fixture events.
- Deterministic Storybook, unit, and E2E evidence for those states.

Out of scope:

- Messages workspace behavior, review-management behavior, profile tasks, exports, clinic preview, navigation redesign, API calls, real analytics, notification delivery, polling, authentication changes, and any durable storage.

## Access, Data, and Storage Decision

The existing temporary password guard and public-route policy remain unchanged. All metric, review, and notification values remain deterministic fixtures; they are not clinic, patient, analytics, or production data.

The only local state is the selected reporting period and read/unread notification state. Read state may use `sessionStorage` so it survives a reload in the same browser session and resets for a new session. No request, database record, browser-wide persistent preference, or external side effect is created.

## Reporting Period Data Contract

The existing periods are `7 days`, `30 days`, and `90 days`. The period must select a complete dashboard snapshot, not merely replace a heading.

| Period  | Impressions | Profile views | Unique visitors | Contacts | Inquiries |
| ------- | ----------: | ------------: | --------------: | -------: | --------: |
| 7 days  |       4,680 |           848 |             543 |       12 |         5 |
| 30 days |      18,420 |         3,284 |           2,105 |       42 |        16 |
| 90 days |      53,680 |         9,410 |           6,006 |      118 |        45 |

The figures rise with the selected period but are not mechanically multiplied. The funnel remains internally valid:

| Transition                       | 7 days | 30 days | 90 days |
| -------------------------------- | -----: | ------: | ------: |
| Impressions to profile views     |  18.1% |   17.8% |   17.5% |
| Profile views to unique visitors |  64.0% |   64.1% |   63.8% |
| Unique visitors to contacts      |   2.2% |    2.0% |    2.0% |
| Contacts to inquiries            |  41.7% |   38.1% |   38.1% |

Every reporting delta compares with the immediately preceding period of the same length: `previous 7 days`, `previous 30 days`, or `previous 90 days`. The current `previous year` copy is not valid for this prototype and must be removed.

### What Changes With the Period

- Impressions, profile views, contacts, and inquiries metric cards, including their comparison deltas.
- All five funnel volumes and the four conversion labels. Conversion labels describe the transition into the displayed result, for example `17.8% of impressions` under Profile views.
- The Profile views over time chart and its accessible description.
- Chart labels and summary: seven daily points for 7 days; daily data with sparse date labels for 30 days; weekly aggregated data for 90 days. The plotted total must equal the selected Profile views metric.
- The review activity insight: `1 new review in the last 7 days`, `5 new reviews in the last 30 days`, and `17 new reviews in the last 90 days`.

### What Does Not Change With the Period

- Profile completion and profile tasks.
- Clinic preview and location data.
- Overall review reputation: `4.8` and the canonical all-time review count. The fixture currently exposes conflicting counts (`124` on the dashboard and `1,248` on the Reviews surface); the dashboard must use the Reviews fixture's canonical total before the period behavior is implemented.
- Specialty categories and the process-optimization status.

The Reviews card therefore separates stable reputation from period activity: `4.8 overall · 1,248 total reviews` plus the selected-period new-review insight. It does not present a short-window rating as the clinic's overall rating.

## Header Notification Center

The notification center stays inside the existing full-interface header. It starts with two unread, fixture-backed events:

1. **New message from Lukas Weber** — `Today, 10:45` — Hair transplant inquiry.
2. **New 3-star review needs a response** — `Yesterday` — Anonymous patient.

The bell carries a badge of `2` while both items are unread. Clicking it opens a compact notification panel under the header on desktop and a full available-width panel below the header on mobile. Each row visibly identifies its type and `New` status; unread state is never color-only.

The panel offers `Mark all as read`. That action updates only the local session state, removes the badge, and replaces the list with `You're up to date`. Individual items may become read when selected, but this first scope does not add deep links or alter the Messages or Reviews screens.

The panel copy deliberately says `Notifications` and `New`, not `since your last visit`: without a real visit history, that stronger statement would be misleading. The session-only read state still gives the intended walkthrough behavior.

## UI and Component Approach

- Move `DashboardReportingPeriod` from the period-control component to a dashboard reporting model in `src/lib/clinic-dashboard/reporting.ts` so fixtures and UI share one contract without a fixture importing a component type.
- Reshape `clinicDashboardFixture.dashboard` around period snapshots plus stable dashboard data and two notification fixtures.
- Let `DashboardOverview` select the complete period snapshot. Render chart points and labels from fixture data rather than a fixed SVG path and fixed comparison copy.
- Keep `DashboardPeriodControl` as the existing segmented control; it already exposes selected state correctly.
- Keep notification read state in `ClinicDashboardApp`, then pass the count, open state, and callbacks through `ClinicDashboardTemplate`.
- Add one focused notification-center molecule for the panel and accessible list behavior. The template retains ownership of the header placement and full-interface gate.

Expected file scope:

- `src/lib/clinic-dashboard/reporting.ts` (new)
- `src/fixtures/clinic-dashboard.ts`
- `src/components/molecules/DashboardPeriodControl.tsx`
- `src/components/molecules/NotificationCenter.tsx` (new)
- `src/components/organisms/ClinicDashboard/DashboardOverview.tsx`
- `src/components/organisms/ClinicDashboard/ClinicDashboardApp.tsx`
- `src/components/templates/ClinicDashboardTemplate.tsx`
- Dashboard Storybook and E2E/unit test files

## Test and Acceptance Plan

- Unit-test the reporting fixtures: `7 < 30 < 90` for all period metrics, valid funnel ordering, correct conversion labels, and a chart total equal to Profile views.
- Unit-test notification sorting, unread count, individual read state, and `Mark all as read` without any API mock.
- Add deterministic Storybook states for 7, 30, and 90 days; unopened notifications; opened unread notifications; all-read notifications; and the narrow mobile header.
- Extend the period interaction story so it asserts metric cards, funnel values, chart comparison/description, chart summary, and review activity—not only the active button and funnel heading.
- Add one focused dashboard E2E flow: enable Full interface, switch 30 to 7 to 90 days, verify visible data changes, open notifications, mark all as read, and verify the badge disappears. Verify the mobile header has no horizontal overflow.
- Verify keyboard behavior: bell has an accurate unread label and expanded state; Escape closes the panel; focus returns to the bell; rows and the all-read action work with Enter and Space.

## Delivery and Risks

This remains a local prototype increment and creates no backend dependency. The primary risk is prototype values being read as live analytics; deterministic fixture wording and the existing full-interface boundary mitigate that risk. A second risk is visual inconsistency between the selected metric, funnel, and chart; the data-contract tests make those relationships explicit.

Implementation starts only after this scope is approved.
