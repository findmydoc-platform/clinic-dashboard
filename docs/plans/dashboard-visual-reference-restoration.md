# Dashboard visual reference restoration

Approved implementation plan, 2026-10-14. The [Clinic Dashboard reporting Product Spec](https://app.notion.com/p/3f9283c73e6181c894f2dca5292338c0) remains unchanged.

## Outcome and evidence

Approved clinic staff recover the established dashboard composition while retaining tenant-safe reporting and the completed notification integration.

The baseline immediately before reporting PR #153 is `1d23beda62c7be249da02306128af09948520607`. Its hierarchy and the existing visual references govern layout. Later approved reporting and profile requirements govern metric meaning, tasks and permissions. Historical prototype figures, excluded metrics and unsupported causal claims are not runtime requirements.

The spec review identified five defects: replacement of the dashboard and its independent workflows, a false zero conversion without a denominator, missing comparison explanations, missing consent information interactions, and review empty copy implying period filtering.

## Access and sources

The application remains private. Reporting uses its existing authorized BFF, provider, strict DTO validation, source states and private no-store responses. Browser input selects only 7, 30 or 90 days. Reporting timezone remains Europe/Istanbul.

Published profile progress and tasks use the existing atomic workspace projection. The upper profile metric and progress card use that same projection. Preview uses authorized published profile and gallery facts. Missing sources never produce demo identity, images, ratings, fabricated values or partial profile tasks.

## Presentation

- Restore clinic identity and period control in the header.
- Show five KPIs: published profile completeness, profile views, CTA interactions, inquiries and session conversion.
- Restore the full-width funnel card with its two defined session stages. Keep event counts, Payload inquiries and session counts distinct.
- Restore profile tasks, the central selectable metric panel, current review summary and published clinic preview.
- Preserve the approximately 1:2:1 desktop lower layout and narrow mobile stacking.
- Default metric selection to profile views and retain the selection and period across section navigation.
- Show source failures and incomplete history locally. Keep available current values when comparison coverage is incomplete.
- Explain consent and missing comparisons with keyboard, hover, click and touch interactions. Activated explanations remain open until dismissed and stay inside the viewport.
- Show undefined conversion without a numerical rate. Show valid conversion comparisons as percentage points.

## Contract gaps

| Reference area                                                    | V1 treatment                                                                                        | Future prerequisite                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Time-series chart                                                 | Preserve the central panel and explain unavailable daily history. Do not derive curves from totals. | A separately approved Website reporting contract extension. |
| CSV download                                                      | No runtime download control.                                                                        | Defined export semantics and authorized source data.        |
| Impressions, unique visitors, generic contacts                    | Explicitly excluded from V1, rather than treated as temporarily missing measurements.               | A new product decision before implementation.               |
| Historic review tags, pending-response totals and period activity | Omit unsourced supplementary claims. Use current public count and rating.                           | A source-backed requirement if these details are needed.    |

## Sequence and mandatory integration gate

1. Prepare dashboard components, pure presentation mapping, Storybook states and regression tests in a separate worktree. Do not change shared workspace, navigation, header wiring or server composition in this phase.
2. Stop before runtime integration until the notification work is complete, its review fixes and local validation are finished, and a final clean committed interface baseline exists.
3. Read the notification task again, pin its final commit, update this branch onto that commit and integrate the dashboard through current public feature contracts.
4. Validate combined navigation, independent source failures, state retention, both themes and responsive layout. Prepare the delivery diff without deployment.

The notification task completed its review fixes and validation on 2026-10-14. Its clean baseline is `ca35de5cb6f57249e26b35c7c7540e83cc09f1d4`. This fulfills the prerequisite once isolated dashboard preparation is validated. The notification worktree remains untouched.

Runtime integration must preserve notification polling, personal receipts, destination opening and focus, unsaved-change guards and principal/clinic resets. Notification refresh or failure must not reload reporting or hide profile tasks. Existing workspace files must not be restored wholesale from the old baseline.

## Validation and delivery

Outside-In TDD seams are the presentation mapper, public screen/Storybook interactions, reporting controller and combined controlled workspace journeys. Existing BFF and tenant-input rejection tests remain required.

Cover available zero, missing denominator, incomplete current and comparison coverage, source-specific outage, request outage, profile-source failure, published-versus-draft preview, profile task navigation, review navigation, and notification destination opening. Verify 320px and 1440px layouts in light and dark themes.

Run formatting, checks, relevant unit/integration/browser tests, controlled E2E, Storybook build and application build. Capture synthetic screenshots. Recommend routed reviewers after validation and run them only after user confirmation. Deployment, new reporting metrics, provider caches, credentials and migrations are excluded.

Rollback reverts only this presentation restoration. It retains the reporting and notification integrations.

## Implementation record

The isolated presentation preparation was validated before the branch was rebased onto the completed notification
baseline. Runtime integration now uses the public overview controller, screen and period control; the former reporting
controller wrapper remains a directly covered standalone example rather than the workspace entry.

The reporting and notification server providers, routes and wire contracts have no restoration changes. Existing
notification destination handling, personal receipts, unsaved-change guards and authenticated scope resets remain intact.
The shared workspace connects profile tasks and review navigation to their existing owners.

Local validation on 2026-10-14 used Node 24: 952 unit, 157 integration, 490 Storybook and 27 controlled E2E tests passed.
Application and Storybook builds passed. Desktop and mobile captures cover both themes. These are synthetic local
acceptance results; they do not establish Preview or Production availability. Cross-application backend acceptance belongs
to the notification baseline and was not repeated for this presentation-only change.

Screenshots are generated under `output/playwright/` and remain local test artifacts. AI reviewer approval and deployment
are not included in these validation results.

The notification center was merged into `origin/main` as `90f234c0e0172053feb9713c4f67ba078927a3af`.
The restoration branch was rebased onto that exact commit without conflicts. The rebased diff changes no notification
provider, route, wire contract, polling, or receipt files.

Final local validation on 2026-10-15 used Node 24: formatting, checks, 956 unit tests, 157 integration tests,
492 Storybook tests, 28 controlled E2E tests, and both Storybook and application builds passed. The E2E suite
regenerated desktop and mobile captures in both themes. Six previously authorized reviewers covered planning,
logic, architecture, security, tests, and UI; their five findings were fixed before this final validation.
No deployment was performed.
