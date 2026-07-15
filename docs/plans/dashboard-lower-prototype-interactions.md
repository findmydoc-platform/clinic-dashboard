# Dashboard Lower Area Prototype Interaction Plan

> **Planning record — 2026-07-15.** This plan extends the dashboard reporting-period work without duplicating its metric, funnel, or time-series implementation.

The required reporting contract is available on `main` through the Dashboard and Header Prototype Interaction implementation. This plan consumes that contract directly.

## User Outcome and Audience

Clinic staff and internal product reviewers can use the lower dashboard without dead controls or false profile completion. Review activity follows the selected reporting period, profile tasks offer truthful details and safe navigation, and chart points are understandable with a pointer or keyboard.

The audience remains the internal prototype walkthrough represented by the existing `visual-reference` and `presentation` variants.

## Scope Decision

In scope:

- Consume the reporting-period snapshot owned by the Dashboard and Header Prototype Interaction work.
- Add pointer- and keyboard-accessible details to chart points without changing the chart data model.
- Show `1`, `5`, or `17` new reviews for the selected 7-, 30-, or 90-day period.
- Keep the overall review reputation stable at `4.8` from `1,248` total reviews and show one fixture-backed pending response.
- Navigate from the dashboard review summary to the existing Reviews workspace without applying a hidden filter.
- Replace generic profile-task `Resolve` actions with truthful review or detail actions.
- Navigate missing-image and open-doctor tasks to existing clinic-profile sections without changing profile data.
- Show non-mutating details for certificate tasks only in the complete prototype interface.

Out of scope:

- Reimplementing reporting-period state, metric cards, funnel values, chart series, chart summaries, or comparison copy.
- CSV or server-generated exports.
- Public clinic preview changes.
- Notification-center behavior.
- Marking profile tasks complete, recalculating `82%`, uploading images or certificates, editing doctor profiles, or adding certificate management.
- Review filtering, responses, appeals, moderation, pagination, or exports.
- Payload, Supabase, PostHog, API, authentication, route, schema, or persistent-storage changes.

## Access, Data, and Storage Decision

The temporary password guard and public-route list remain unchanged. All values are deterministic fixtures and contain no real clinic, patient, review, or analytics data.

The selected period is supplied by the existing dashboard reporting contract. The selected profile task is ephemeral component state and resets on navigation or reload. This scope adds no browser storage, network request, database record, or external side effect.

## UI and Interaction Plan

### Chart Point Details

- Reuse the chart points and selected-period snapshot from the dashboard reporting work.
- Show date or week plus Profile views on pointer hover and keyboard focus.
- Expose the same values through accessible text without requiring hover.
- Do not add another selector, dataset, summary, comparison, or export action.

### Reviews Summary

- Keep `4.8` and `1,248 total reviews` stable across periods.
- Display `1`, `5`, or `17 new reviews in the last {period}` from the selected reporting snapshot.
- Display `1 response pending` from the existing deterministic review fixture.
- Show `View reviews` in both interface modes because the existing Reviews workspace is available read-only.
- Switch to the Reviews workspace without adding a route or hidden filter.
- Keep treatment-category pills read-only.

### Profile Progress

- Keep `82%` and the four open tasks stable across periods.
- Use these actions:
  - `Missing images` → `Review images`.
  - `Open doctor profiles` → `Review team`.
  - `Certificates required` and `Certificate expiry` → `View details` in Full interface only.
- Open a responsive task-details dialog with the task, priority, explanation, and available next step.
- On desktop, centre the dialog. On mobile, keep it within the viewport with a scrollable body and visible footer.
- `Review images` can navigate to and focus the existing clinic image gallery.
- `Review team` can navigate to and focus the existing doctors-and-team section.
- Show `Review images` and `Review team` in both interface modes because they navigate to existing read-only profile content. Use the existing `profileWrites` behavior rather than the reporting gate.
- Give the destinations stable IDs: `clinic-profile-gallery` and `clinic-profile-team`. Each destination uses `tabIndex={-1}`, receives focus after navigation, and calls `scrollIntoView` with reduced-motion-safe behavior. Focus the section, not a profile-write button.
- Certificate dialogs have no navigation or completion action and state that certificate management is not available yet.
- Keep certificate actions behind the existing `laterScope` gate so they appear only in Full interface.
- Escape closes the dialog and returns focus to its trigger.
- Do not introduce a local completion action or an unverified numerical conversion claim.

### Public Clinic Preview

The preview card, image, rating, location, and current visibility gate remain unchanged.

## Internal Interfaces and Component Approach

- Extend the profile-task fixture with stable `id`, explanation, action type, and optional `gallery` or `team` destination.
- Keep selected-task state and destination navigation in `ClinicDashboardApp`.
- Let `DashboardOverview` receive the selected reporting snapshot plus callbacks for Reviews and profile-task actions.
- Add one focused profile-task dialog molecule and reuse existing cards, buttons, dialog primitives, spacing, typography, icons, and findmydoc tokens.
- Add no public API, route, database schema, or shared persistence interface.

## Test and Acceptance Plan

Unit tests:

- Review activity maps correctly to 7, 30, and 90 days while rating, total reviews, and profile completion remain stable.
- Only image and team tasks have profile destinations.
- Certificate tasks never expose navigation or completion.

Browser Storybook tests:

- Review activity updates with the selected period.
- Chart-point values are equivalent on hover and keyboard focus.
- Every task dialog opens, closes with Escape, returns focus, and distinguishes navigable from unavailable tasks.
- Both interface modes and the 320 px short viewport pass accessibility checks without overflow.

End-to-end coverage:

- Switch reporting periods and verify review activity changes without a second period control.
- Navigate from the review summary to Reviews.
- Open one navigable profile task and verify destination focus.
- Open one certificate task and verify that it has no navigation or completion action.
- Verify the lower dashboard and dialog have no horizontal overflow at 320 px.

No integration test is required because this scope has no persistent data behavior.

## Delivery and Reviewer Gates

1. Run `planning_reviewer` on this document before implementation.
2. Implement the bounded lower-dashboard change on top of the dashboard reporting contract.
3. Run format, static checks, unit tests, Storybook tests, responsive E2E, both builds, dead-code, and diff checks.
4. Run `ui_reviewer` and `test_reviewer` read-only before handoff.
5. Present every finding before applying reviewer-driven fixes. A separate user confirmation remains required for those fixes.
6. Treat severity 7–10 findings as blockers for implementation or handoff.

The final handoff includes current desktop and mobile screenshots inline. No security reviewer is required because access, authentication, storage, APIs, and sensitive data remain unchanged.

Delivery is limited to the local branch and a pull-request prototype. Production deployment is not part of this work because production remains disabled in the project profile.

Primary risks and mitigations:

- **Reporting drift:** consume the single reporting fixture contract and assert review activity against its selected period.
- **Prototype data mistaken for live analytics:** keep all values deterministic and add no network or persistence path.
- **False profile completion:** never change the `82%` value or task status from the dashboard.
- **Focus loss after cross-workspace navigation:** focus the stable destination section after the new workspace renders.

## Acceptance Summary

This scope is complete when review activity follows the existing reporting period, dashboard-to-Reviews navigation works, profile tasks provide truthful details and safe navigation without changing completion, chart points are pointer- and keyboard-readable, and the clinic preview remains untouched.
