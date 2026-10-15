# Dashboard visual reference restoration

Approved revision, 2026-10-15. The [Clinic Dashboard reporting Product Spec](https://app.notion.com/p/3f9283c73e6181c894f2dca5292338c0) defines reporting requirements. This engineering plan owns restoration provenance, implementation, the independent picker work and validation. Other Product Specs remain unchanged.

## Outcome and evidence

Approved clinic staff use the established dashboard composition with tenant-safe reporting and the completed notification integration. The accepted reference is the rendered Workspace VisualReference story at `1d23beda62c7be249da02306128af09948520607`, immediately before PR #153, captured at desktop and mobile widths in both themes. The older static prototype image is not an acceptance reference.

The implementation starts at saved restoration commit `c7a695e5b8e7ef99a66dfe43da47d2ed6c632e16` on `feature/dashboard-five-card-journey`. The pushed `feature/dashboard-ui-restoration-snapshot-20261015` branch remains unchanged.

The first restoration corrected five defects: loss of independent dashboard workflows, a false zero conversion without a denominator, missing comparison explanations, missing consent information interactions, and review empty copy implying period filtering. This revision aligns the journey cards and interactions with the accepted reference while retaining those corrections.

## Access and sources

Reporting retains the authorized BFF, provider, strict DTO validation, source states and private no-store responses. Browser input selects only 7, 30 or 90 days. Reporting timezone remains Europe/Istanbul. No Website reporting contract changes are required.

Published profile progress and tasks use the existing atomic workspace projection. The upper profile metric and progress card use that same projection. Preview uses authorized published profile and gallery facts. Missing sources never produce demo identity, images, ratings, fabricated values or partial profile tasks. Reviews remain a current snapshot.

## Presentation

- Restore exactly five selectable journey cards: Impressions, Profile Views, Unique Visitors, Contacts and Inquiries. Match the reference proportions, standard card surfaces, spacing, icons, connectors and accent selection.
- Keep the title Conversion funnel. Directional arrows show journey order only, without measured conversion percentages. Provide an accessible explanation of the separate populations.
- Map Profile Views to consent-limited event counts, including repeated events. Map Inquiries to stored inquiries excluding spam for the selected period.
- Show Not supported yet for Impressions, Unique Visitors and Contacts. Contacts means chat conversations. Never substitute sessions for visitors or CTA clicks for chats. Unsupported cards remain selectable without numbers, comparisons, retries or measured charts.
- Replace the two session cards with a compact summary below the five cards. Show returned session denominator, numerator, valid rate and percentage-point comparison according to availability. With no qualifying sessions, show no numerical rate. Explain that this calculation is independent of the five cards.
- Display exactly five KPIs in reference order: Public profile completion, Impressions, Profile views, Contacts and Inquiries. Reuse journey measurements and unsupported explanations. KPIs never select a journey stage. CTA remains in the reporting contract only; session conversion appears only below the journey cards.
- Restore the grouped 7/30/90 control. Default journey selection to Profile Views and retain selection and period across section navigation and reporting refreshes.
- Each journey card controls the central detail panel. Supported cards show their values and source states; unsupported cards explain the missing capability. Do not generate live curves or CSV from aggregate totals.
- Retain profile tasks, review summary, authorized clinic preview, the approximately 1:2:1 desktop lower layout and mobile stacking.
- Keep zero activity, incomplete history, missing comparison, source failure and unsupported capability distinct. Independent available facts remain visible.
- Information controls support keyboard, hover, click and touch. Activated explanations remain open until dismissed and stay within the viewport.

## Presentation models and demo

Journey stages and supported reporting metrics have separate presentation models. Unsupported capability is a presentation state only; the Website wire contract gains no metrics or states. Card selection changes local state only. Period changes remain the only reporting query input.

Reconnect the complete historical click demo through existing components and public feature contracts. Label it clearly and keep synthetic measurements, illustrative charts and existing demo exports confined to the separate demo and controlled tests. Normal reporting never uses demo fallback values.

## Header and picker restoration

Restore the original header and clinic/location picker appearance. Normal reporting displays only the authorized clinic; the demo may select synthetic locations. Real multi-clinic selection is a separate extension. These are engineering restoration tasks and introduce no picker requirement in the Reporting Product Spec.

## Contract gaps and follow-up

| Area                   | Current treatment                                                    | Follow-up                                                                       |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Impressions            | Visible, selectable, Not supported yet                               | Define search-impression measurement and authorized source.                     |
| Unique Visitors        | Visible, selectable, Not supported yet                               | Define visitor identity, consent and measurement without substituting sessions. |
| Contacts               | Visible, selectable, Not supported yet                               | Define chat-conversation measurement, separate from CTA clicks.                 |
| Journey relationships  | Directional arrows without percentages                               | Define valid relationships and populations before measured stage conversions.   |
| Time series            | Preserve detail panel with an honest unavailable-history explanation | Approve daily measurement contract.                                             |
| CSV                    | No live download; retain existing demo export                        | Define export semantics and authorized data.                                    |
| Multi-clinic selection | Authorized clinic only; synthetic demo selection                     | Separate access, scope and selection requirements.                              |
| Review extras          | Current public count and average only                                | Source-backed requirements for tags, pending totals or period activity.         |

These capabilities remain explicit follow-up work. They are neither silently implemented nor permanently discarded.

## Notification integration gate

The notification integration prerequisite is fulfilled. Its final reviewed baseline was `ca35de5cb6f57249e26b35c7c7540e83cc09f1d4`; its merge into main is `90f234c0e0172053feb9713c4f67ba078927a3af`. The saved restoration already includes this integration.

Preserve notification polling, personal receipts, exact destination opening and focus, unsaved-change guards and principal/clinic resets. Notification refresh or failure must not reload reporting or hide profile tasks. Do not copy old Workspace files wholesale or change the notification worktree.

## Implementation sequence

1. Save and verify the approved Product Spec amendments, then update this plan before code changes.
2. Add behavior coverage at the mapper, public screen and controlled workspace seams.
3. Implement the five-card presentation, summary, KPI information and grouped period control. Reconnect the separate demo and restore picker presentation through public feature contracts.
4. Validate combined navigation, source isolation, selection retention, responsiveness and both themes. Capture synthetic screenshots.
5. Record new validation separately from prior implementation evidence. Recommend reviewers after validation and run them only after user confirmation.

## Acceptance and validation

Outside-In TDD seams are the presentation mapper, public screen/Storybook interactions, reporting controller and controlled workspace journeys. Keep BFF and tenant-input rejection tests.

- Exactly five journey cards in order, with no sixth session card.
- Only matching Profile Views and Inquiries contract values appear in their cards.
- Unsupported capability, source outage, incomplete history and measured zero remain distinguishable.
- Every card controls the detail panel. Card selection and period survive section navigation and reporting refreshes.
- Keyboard and touch selection, accessible explanations and focus work.
- Compare 1440, 390 and 320 pixel layouts in light and dark themes, including data gaps and failures.
- Retain reporting, profile-task/editor and notification-destination journeys. Notification polling and failure remain independent of reporting.

Run format, checks, relevant unit/integration/Storybook tests, controlled E2E, Storybook build and application build. Include screenshots in handoff. New PRs, deployment, backend reporting extensions, caches, credentials and migrations are outside this task. Rollback affects only this presentation revision and retains reporting and notification integrations.

## Five-card revision evidence, 2026-10-15

The approved Product Spec amendments were saved and read back before implementation. The Reporting Spec contains no
picker requirements, commit links or restoration narrative. Existing metric, access and snapshot definitions remain intact.

The revision implements the five journey cards, presentation-only unsupported capability, independent session summary,
non-selectable KPIs with CTA information, and grouped period control. Normal mode lists only the authorized clinic.
The complete click demo is separately accessible in Storybook under Workspace / Pages / Clinic Dashboard Workspace /
Visual Reference. Its initial state is Profile Views and 30 days. Reporting Demo Interactions exercises card, period and
synthetic location changes. Demo CSV retains the existing profile-view export; no live export or time series was added.

Validation used Node 24. The full suites passed 957 unit tests, 157 integration tests and 494 Storybook tests. After separating
the initial reference story from its interaction story, the seven affected Storybook tests passed. All 28 controlled E2E
journeys passed across the full run and focused screenshot rerun. The simulated 503 failure is explicitly expected in the
screenshot test; the successful-data captures require a clean browser console. Storybook and application builds passed.

Synthetic captures under `output/playwright/` cover normal reporting, unavailable reporting with an unsupported stage
selected, and the complete demo at 1440, 390 and 320 pixels in light and dark themes. Overflow checks passed. These local
results do not establish Preview or Production availability. No reporting provider, BFF, wire contract, notification
controller, polling or receipt implementation changed.

Additional reviewers have not run for this revision. They require fresh user confirmation. No new PR or deployment was
created. The snapshot branch remains at the saved baseline.

## Prior implementation evidence

The following records describe the earlier restoration. They do not validate this revision.

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

## KPI alignment and cleanup revision

Approved on 2026-10-15. Continue from `1a005881` on the existing working branch.
The Product Spec now defines the reference KPI order and removes the CTA display requirement.

- Share supported and unsupported measurement presentation between KPIs and journey cards.
- Keep Impressions and Contacts unsupported during loading and source failures; never substitute CTA clicks.
- Remove CTA-only presentation mapping and controls, preserving the wire contract and provider coverage.
- Remove the obsolete standalone Reporting screen and its stories. Transfer relevant coverage to the current overview.
- Remove the Storybook-only reporting wrapper and its redundant story; keep the live reporting hook.
- Rename the internal session-funnel model to session-conversion summary.
- Remove orphaned imports, exports and fixtures after checking runtime and Storybook consumers. Keep the historical interactive demo.

Validate exact KPI order, shared values, zero versus unsupported versus failure, non-selectable KPIs, accessible explanations,
selection retention and the independent session summary. Retain profile and notification journeys. Compare 1440, 390 and
320 pixels in both themes. Run format, checks, relevant tests and both builds; capture screenshots.
CTA product relevance remains follow-up work. No new PR or deployment is included.

### KPI revision validation, 2026-10-15

The Reporting Product Spec was updated and read back before code changes. The KPI order is Public profile completion,
Impressions, Profile views, Contacts and Inquiries. CTA remains in the reporting contract, without dashboard presentation.
The obsolete Reporting screen and Storybook-only wrapper were deleted with their stories. Coverage for incomplete history
and source failure now runs on DashboardOverviewScreen. Shared formatting remains internal where no external consumer exists.
The historical demo and the live reporting hook remain in use.

The full unit suite passed 957 tests; after adding three state regressions, the affected mapper suite passed all nine tests.
All 157 integration tests, 21 affected dashboard/workspace Storybook tests and 28 controlled E2E journeys passed. Format,
lint, typechecking, architecture/story governance, reviewer contracts, prose checks and unused-code checks passed.
Application and Storybook builds passed. Storybook retained its advisory large-chunk warning.

Fresh synthetic captures cover 320, 390 and 1440 pixels in both themes, including unavailable reporting. No horizontal
overflow occurred. Desktop, mobile and source-failure captures were visually inspected. These results are local evidence,
not deployment validation. No provider, BFF, reporting wire contract or notification implementation changed.
Additional reviewers remain pending user confirmation. No new PR, push or deployment is part of this revision.
