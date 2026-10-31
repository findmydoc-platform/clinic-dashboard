# Five-metric clinic reporting

This plan implements [spec #299](https://github.com/findmydoc-platform/clinic-dashboard/issues/299) and tickets #300 through #305. The approved product specification and three test boundaries remain authoritative. The parent spec and gap item are not completion targets of the implementation pull requests.

## Outcome and audience

Authorized clinic staff can inspect impressions, profile views, unique visitors, inquiry starters, and stored inquiries for the selected clinic. Each measurement preserves its own population, activity time, coverage, and source failures. The public profile completion projection and independent reviews, tasks, and preview remain available.

## Scope

Implement exactly five selectable reporting cards in the approved order and five upper positions: published public profile completion followed by four neutral `Content to be defined` placeholders. Preserve Profile Views as the initial selection, scoped display preferences, period navigation, clinic-switch cancellation, and the explicitly separate synthetic demo with its supported charts and exports.

Website/Payload owns the versioned successor contract, authorization, Istanbul calendar periods, aggregation, analytics event governance, source coverage, and source isolation. Dashboard owns its session, same-origin BFF, runtime validation, controller, and presentation. An explicit successor ADR precedes the first contract change. Temporarily preserve V1 until coordinated consumer migration is evidenced; remove obsolete calculations and exclusive capture/transport only after a concrete consumer inventory.

The implementation does not introduce conversion rates, abandonment rates, daily live series, live CSV, cross-device identity linkage, persistent aggregates, a shared cache, stale fallback, new public Dashboard routes, or deployment configuration changes. Operational inquiry data, audit, permissions, idempotency, notifications, and authentication remain outside reporting cleanup.

## Access and data

Dashboard reporting remains private and requires its existing server session. Website/Payload checks current access to the requested clinic on every read using the existing clinic-scope contract. Requests retain private no-store headers. Browser clinic IDs are targets rather than authorization. No Dashboard database or direct PostHog access is added.

Analytics events contain governed minimal technical context only. Form values, contact details, medical selections, free text, individual analytics identifiers, and credentials are excluded from reporting output. Shared consent-based analytics recognition powers both visitor metrics. Missing instrumentation history is partial coverage rather than zero. Source states are independent and no prior success masks an outage.

## UI and component ownership

Extend the existing dashboard controller, mapping, screen, reporting cards, information elements, and colocated stories under the frontend architecture contract. The upper placeholders are static, neutral, and do not select a reporting stage. The published completion projection continues to feed both the top KPI and profile progress. Information remains reachable by keyboard and touch. Verify 320, 390, and 1440 pixel widths in both themes with controlled data.

## Confirmed test boundaries

1. Public Website browser interaction through controlled analytics output. Verify actual viewport visibility and active tabs for impressions; real form changes for inquiry starts, including consent, prefill exclusions, and content-free payloads.
2. Website reporting endpoint through Dashboard BFF. Exercise current clinic authorization, the versioned DTO, source isolation, calendar boundaries, zero and coverage states, query budget, and synthetic events through the actual aggregation query. Precomputed analytics stubs do not prove aggregation.
3. Full Dashboard screen and controls. Extend existing browser stories and controlled clinic-scope Playwright coverage for selection, period, reload, legacy Contacts preferences, clinic switches and late responses, missing history, outage, and independent Payload data.

Use Outside-In TDD in vertical behavior slices at these confirmed seams. Run focused tests, required `pnpm check`, UI browser tests and Storybook build, and application builds when output changes. Save and inspect synthetic screenshots in ignored artifact folders. Controlled verification and real source configuration/deletion evidence remain separate.

## Task graph and integration

The verified GitHub blocking graph is #300, then #301, then the parallel frontier #302/#303/#304, then #305. Each ticket uses a fresh implementer context, branch, and worktree based on `feature/299-clinic-reporting`. Merge completed ticket branches through a dedicated merger context. The same integration branch name in each owning application records the coordinated cross-repository change; separate repositories require separate pull requests.

Open draft pull requests after the first integrated code change. Only completed implementation tickets receive closing references. Do not close the parent spec or gap item. Historical cleanup is not complete until its actual selected data and before/after evidence are verified. Preserve active worktrees while their work is unmerged or incomplete.

## Rollout, risks, and external dependencies

Deliver the Website successor before switching Dashboard consumption; preserve the old contract during the compatibility window. Source configuration must establish real instrumentation start and retention rather than claiming full history from query success. No environment deployment or destructive data cleanup is authorized by a source-only check.

Read external PostHog consumers before deciding whether CTA events, the server inquiry event, or optional analytics session transport remain necessary. Produce an exact cleanup inventory with filters, data kinds, dependencies, and retained consumers. Any irreversible external deletion requires a concrete reviewed selection and final confirmation. Missing access or deletion capability remains an explicit dependency of #305; never describe removed queries as deleted history.

AI reviewers require separate user confirmation under the repository review gate. Route the completed validated diff, recommend the exact reviewer set, and obtain that confirmation before execution. The integration remains a draft while required evidence or review decisions remain open.
