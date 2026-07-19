# Clinic Dashboard Prototype and Capability Visibility Plan

> **Planning record — 2026-07-13.** This document owns the Clinic Dashboard visual reference, fixture states, and temporary UI visibility gates. It is paired with the [Website Capability Matrix](https://github.com/findmydoc-platform/website/blob/main/docs/roadmap/clinic-dashboard/capability-matrix.md) from [website#1523](https://github.com/findmydoc-platform/website/issues/1523).
>
> **Approved runtime prerequisite:**
> [ADR 026](https://github.com/findmydoc-platform/website/blob/main/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md)
> fixes the stateless BFF, server-only Supabase session, Payload API, environment, failure, and private-live cache
> boundaries. Runtime integration follows the
> [local authentication and BFF architecture](../authentication-and-bff.md).

## Required Reading and Synchronization

Read this plan and the Website Capability Matrix together before changing a dashboard screen, gate, fixture, or integration. The records are complementary:

| This repository owns                                                                                                                                    | The website repository owns                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screen structure, navigation, components, fixtures, Storybook evidence, responsive behavior, temporary visibility gates, and the Dashboard BFF/runtime. | Payload schema, current principal authorization, focused REST/custom endpoints, DTO contracts, cache/revalidation, PostHog reporting, and the capability classification for each visible action. |

When a change crosses that boundary, update both records in the same work item:

1. A changed screen, control, fixture, or gate updates this plan and its matching Website Capability Matrix row.
2. A changed website capability, API shape, permission, cache impact, or owning issue updates the Website Capability Matrix and this plan's affected gate or fixture note.
3. Do not infer a backend contract from a prototype control. Link its existing owning issue instead.
4. Do not delete unfinished prototype UI solely because its backend capability is unavailable. Use a temporary gate and remove it when the owned capability is implemented.

This plan does not define a database, Payload collection, public cache policy, or PostHog query. ADR 026 and the paired
architecture documents define authentication and integration; this visual plan must not override them.

## User Outcome and Scope

Clinic teams, product reviewers, and implementation agents can inspect the complete intended UI without mistaking a fixture or a visible control for a working product capability. The same prototype supports a full visual reference and a coherent presentation before the MVP is complete.

In scope: rescued screen captures, visual/component coverage, fixtures, responsive behavior, and temporary visibility
gates. Out of scope: runtime BFF implementation, durable Dashboard storage, database/schema work, Supabase/Payload
configuration, authorization, PostHog queries, and deployment behavior.

## Relationship to Existing Issues

| Work item                                                                             | Relationship                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [website#1523](https://github.com/findmydoc-platform/website/issues/1523)             | Provides the backend capability matrix and owns the classification/dependency planning record.                                                                 |
| [clinic-dashboard#1](https://github.com/findmydoc-platform/clinic-dashboard/issues/1) | Owns transfer of the rescued visual prototype, navigation, Stories, fixtures, and app shell. This plan is its UI-planning companion; it adds no backend scope. |
| [website#1522](https://github.com/findmydoc-platform/website/issues/1522)             | Records ADR 026 and the synchronized application/API implementation plans.                                                                                     |
| [website#1524](https://github.com/findmydoc-platform/website/issues/1524)             | Owns the focused server-authenticated Payload bootstrap and DTO. No Dashboard integration starts from this visual plan.                                        |
| [website#1525–#1533](https://github.com/findmydoc-platform/website/issues/1525)       | Own the backend capabilities referenced by gates below. The Website Capability Matrix is the authoritative issue-to-control mapping.                           |

## Visual Reference Screens

The captures below are fixture-backed. Visual presence does not imply a functional backend capability. The original visual source remains the linked Stitch project in the Website Capability Matrix.

| Screen                 | Reference capture                                                                                                                                    | Capability mapping                                                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard overview     | [dashboard overview](./assets/clinic-dashboard-prototype/dashboard-overview.png)                                                                     | Reporting with four selectable fixture-backed KPI series, a static profile-completion card, a five-stage conversion process, static clinic identity and location summary, a top-aligned lower grid, clinic preview, profile actions, and certificate-task controls. |
| Messages               | [messages](./assets/clinic-dashboard-prototype/messages-default.png)                                                                                 | Inquiry access (#1526), conversations/messages (#1530), and unowned templates.                                                                                                                                                                                      |
| Patient inquiry dialog | [inquiry projection](./assets/clinic-dashboard-prototype/patient-profile-dialog.png)                                                                 | Purpose-limited inquiry projection (#1526); no inferred medical record.                                                                                                                                                                                             |
| Reviews management     | [historical capture](./assets/clinic-dashboard-prototype/reviews-management.png); its obsolete export control is excluded from the current reference | Own-clinic review management (#1529); no raw review export surface.                                                                                                                                                                                                 |
| Clinic profile editor  | [profile editor](./assets/clinic-dashboard-prototype/clinic-profile-editor.png)                                                                      | Clinic fields/treatments/completeness (#1528), public team (#1527), and public-cache constraints.                                                                                                                                                                   |
| New treatment dialog   | [new treatment](./assets/clinic-dashboard-prototype/new-treatment-dialog.png)                                                                        | Platform-owned treatment master data and #1528.                                                                                                                                                                                                                     |
| Add team member dialog | [add team member](./assets/clinic-dashboard-prototype/add-team-member-dialog.png)                                                                    | Doctor-specific UI versus public non-doctor team records (#1527).                                                                                                                                                                                                   |

## Access, Data, and Storage Decision

The current prototype is data-less, fixture-backed, and protected by the repository's temporary password guard. It
contains no real clinic or patient data, Supabase session, Payload credentials, or Dashboard-owned persistence. The
unauthenticated route list remains unchanged.

The clinic identity is a single static fixture. The header presents `Berlin Health Clinic — Mitte` as one identity,
with the location attached to the clinic name instead of exposing a separate location selector. The dashboard preview
continues to show `Mitte, Berlin`. Neither value is a clinic or tenant identifier, and no location choice is sent to a
command or browser storage.

The Subscriptions destination contains no subscription data or state. Its neutral blocks are decorative only and do
not represent a loading request, plan, price, product claim, control, service, or storage contract.

The Certificates and accreditations destination likewise contains no credential, certificate, accreditation, upload,
verification, or status data. Its neutral blocks are decorative only and do not represent a loading request, product
claim, control, or storage contract.

The approved runtime remains stateless: browser application code calls only the Dashboard origin; the Dashboard BFF
stores the Supabase session in host-bound `HttpOnly` cookies and sends the current access token to Payload server-side.
Payload resolves the current `clinicStaff`, clinic, approval, and permissions for every request. The browser never calls
Payload, and Payload CORS is not expanded. A UI gate never grants access.

## Prototype Variants and Temporary Visibility Gates

The complete prototype remains the visual and responsive reference. A missing backend capability must not cause its component, Storybook story, fixture, screenshot, or responsive coverage to disappear.

| Variant            | Use                                                    | Visibility rule                                                                                                                                                     | Required evidence                                                                                                   |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `visual-reference` | Product/design review and implementation planning      | Show every defined prototype component with fixtures, including future and non-functional controls.                                                                 | Every screen and responsive state remains represented in Storybook and visual QA.                                   |
| `presentation`     | Internal or external walkthrough before MVP completion | Show one owner-selected coherent slice. Temporary gates can hide unsupported controls or screen areas, while the component remains available in `visual-reference`. | Test selected desktop and mobile paths for no dead controls, layout gaps, overflow, or inaccessible hidden content. |

Gates are typed configuration selected directly by Storybook or the app composition. They are not user-facing toggles, query parameters, authorization mechanisms, or substitutes for server-side permission checks. No artificial `mvp` mode exists; later server-authorized capabilities replace and remove their temporary gate branches.

| UI group                                    | `presentation` behavior                                                                                                                                                                                                                                                    | Backend owner                                                                                                                                        | Removal trigger                                                                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard reporting controls and values     | Show only deterministic fixture series and label the chart as prototype data, never live analytics. Impressions, profile views, contacts, and inquiries are local selectable controls; profile completion remains static, and CSV export remains limited to profile views. | [website#1531](https://github.com/findmydoc-platform/website/issues/1531)                                                                            | Tenant-safe reporting facade defines approved, source-backed metrics. Impressions and booking-derived claims remain unavailable until that contract exists. |
| Message workspace and conversation controls | Hide or disable unsupported sending, attachment, note, and conversation commands as one group.                                                                                                                                                                             | [website#1526](https://github.com/findmydoc-platform/website/issues/1526), [website#1530](https://github.com/findmydoc-platform/website/issues/1530) | Authorized inquiry projection and conversation capability exist.                                                                                            |
| Review-management actions                   | Hide response drafts, pending-moderation responses, appeal-case details, audit events, and management controls outside the selected walkthrough; continue showing only published responses.                                                                                | [website#1529](https://github.com/findmydoc-platform/website/issues/1529)                                                                            | Authorized review management and separate approved-response/moderation contracts exist.                                                                     |
| Profile-write and treatment controls        | Keep a coherent read-only or selected-edit walkthrough; do not imply draft/publish behavior.                                                                                                                                                                               | [website#1528](https://github.com/findmydoc-platform/website/issues/1528)                                                                            | Supported fields and write contract are implemented.                                                                                                        |
| Public non-doctor team creation             | Hide or disable the create flow when it is outside the selected slice.                                                                                                                                                                                                     | [website#1527](https://github.com/findmydoc-platform/website/issues/1527)                                                                            | Authorized public-team record and write flow exist.                                                                                                         |
| Certificate task details                    | Hide certificate actions without removing the underlying profile tasks.                                                                                                                                                                                                    | No approved backend issue                                                                                                                            | An approved certificate capability exists.                                                                                                                  |
| Notification center                         | Hide the notification panel and local read-state controls.                                                                                                                                                                                                                 | No approved backend issue                                                                                                                            | An approved notification capability exists.                                                                                                                 |
| Support request flow                        | Hide the support entry point and request dialog. In `visual-reference`, keep only local validation, an `Email` reply-method label, and the result `Prototype only — no request was sent.`                                                                                  | No approved backend issue                                                                                                                            | An approved support destination and request capability exists.                                                                                              |
| Staff profile                               | Show the same read-only fixture identity in both variants without implying an authenticated current principal. Keep account profile, theme, and sign-out as separate menu actions.                                                                                         | Future server-authenticated staff identity contract.                                                                                                 | The fixture projection is replaced by the authorized current-staff response.                                                                                |
| Subscriptions placeholder                   | Hide the navigation item and workspace. In `visual-reference`, show only an explicit unfinished-preview explanation and decorative blocks hidden from assistive technology.                                                                                                | No approved backend owner. The current Website Capability Matrix has no subscription contract.                                                       | An approved subscription product and backend contract replaces the placeholder gate.                                                                        |
| Certificates and accreditations placeholder | Hide the navigation item and workspace. In `visual-reference`, show only an explicit unfinished-preview explanation and decorative blocks hidden from assistive technology.                                                                                                | No approved backend owner.                                                                                                                           | An approved clinic credential and accreditation product and backend contract replaces the placeholder gate.                                                 |

Reply templates remain part of the message-workspace gate. The aggregate profile-views export remains part of Dashboard reporting, while Review management exposes no download or export. The Subscriptions and Certificates and accreditations placeholders are local navigation and visibility contracts only; they add no Website Capability Matrix row. The current prototype has no appointment surface, so it emits no appointment capability or placeholder gate.

When a capability becomes functional, remove its temporary gate branch rather than accumulating permanent prototype flags. Update the matching Website Capability Matrix row in the same change.

## Fixture, Analytics, and Component Approach

Dashboard overview data remains fixture-backed until [website#1531](https://github.com/findmydoc-platform/website/issues/1531) delivers its tenant-safe reporting facade. The prototype must not query PostHog directly, expose a PostHog key, embed a PostHog dashboard, or create dashboard-owned business storage.

Later reporting reads approved behavioural aggregates from PostHog server-side and authoritative inquiry, review, and completeness facts from Payload through the website-owned contract. The dashboard receives only the shaped response.

Review fixtures keep published and pending-moderation responses as separate values. Saving the local response preview creates only a deterministic pending-moderation value and explicitly states that nothing was submitted or sent; it does not replace published text, change review or appeal status, or imply that the clinic can publish directly. Pending values remain management-only, while presentation mode projects only published review activity. The matching Website Capability Matrix row remains unchanged: website#1529 owns the future schema and authorized moderation contract, and only approved responses may affect public cached output.

Appeal fixtures use an optional review-owned case with a deterministic reference, submitted or under-review status, and ISO-timestamped events ordered oldest first. Saving an appeal preview creates one local submitted event; the only local status change marks that case as under review and appends one event. Case references, reasons, details, events, and controls remain management-only, with no retry, withdrawal, final decision, moderation service, persistence, or external request. The Website Capability Matrix ownership remains unchanged: website#1529 still owns the future authorized review-response and appeal contracts.

Review management exposes no raw CSV serializer, browser-download adapter, controller action, or UI control. The separate Dashboard export remains limited to aggregate profile-view series and contains no review-author records.

The treatment prototype keeps four platform-owned master-treatment fixtures separate from the clinic profile's three
`masterTreatmentId` and price relationships. The visual-reference create flow can select only an unassigned master
treatment and enter its clinic price; editing changes only that price. It does not model clinic-owned names, categories,
duration, currency, description, active state, or ordering. `Treatment missing?` closes the create dialog and opens the
local-only support prototype, while presentation mode keeps the relationship list and details read-only.

## Test and Acceptance Plan

- Verify the narrow mobile viewport first, then tablet and desktop.
- Verify that the conversion stages form one semantic list, stack below `xl`, and at 1440 px keep stage panels at or
  below 10 rem with at least 3 rem connector gaps and 2 rem arrows. Verify the lower dashboard columns remain
  top-aligned at approximately 1:2:1 without horizontal overflow at 320 px.
- Verify navigation, dialogs, hidden-gate states, focus return, no horizontal overflow, and no inaccessible hidden controls.
- Verify that the support prototype exposes no phone, WhatsApp, address, service-hours, direct-support, ticket, SLA, or response promise and creates no external side effect.
- Verify the static clinic identity in both prototype modes, confirm that no location selector is rendered, and keep the
  header and dashboard preview free of horizontal overflow at the narrow mobile viewport.
- Verify review response drafts become deterministic pending-moderation values, preserve published text and review or appeal status, remain absent from presentation mode, and expose no retry or withdrawal action.
- Verify appeal cases create one submitted event, allow only the submitted-to-under-review transition, keep events oldest first with unique IDs, prevent a second case, and project no case data or controls into presentation mode.
- Verify Review management exposes no export action or control in either prototype mode, while the aggregate Dashboard profile-views export remains unchanged.
- Preserve the seven fixture states as visual regression evidence until an equivalent source-backed state replaces each one.
- When an integration is added, verify loading, empty, forbidden, expired-session, and failure states without exposing another clinic's data.
- Confirm the matching Website Capability Matrix row and this plan are both updated for every cross-boundary change.

## Delivery, Rollout, and Risk

The app-shell implementation adds only local navigation, dialog state, deterministic fixtures, and presentation visibility. Its risks are visual drift and capability confusion, mitigated by the preserved captures, paired Storybook variants, typed gates, and reciprocal links to existing owner issues. The fixtures must never be treated as clinical, patient, analytics, or production data.
