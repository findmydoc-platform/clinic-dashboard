# Clinic Dashboard Demo Mode and Multi-Location Data

> **Approved implementation plan — 2026-07-19.** This plan introduced the private multi-location demo foundation. The later [demo experience and transient flows plan](./clinic-dashboard-demo-experience-and-transient-flows.md) supersedes its workspace-provider, presentation-mode, and session-state details.

## User Outcome And Audience

Clinic administrators can switch among synthetic Avenora clinics in İstanbul, İzmir, and Antalya and immediately see a coherent, visibly different workspace for the selected location. The demo is intended for product review and stakeholder demonstrations; it must remain visibly synthetic and must not imply live clinic data.

## Scope

- Add a server loader that returns a private provisional `ClinicDashboardWorkspaceInput`; the later demo-experience plan removes its temporary source marker.
- Keep organization, account, treatment catalogue, notifications, subscriptions, and credentials organization-wide.
- Provide location snapshots for dashboard reporting, clinic profile, messages, patient inquiry, and reviews.
- Use general string location IDs and validate selected IDs against the supplied location list.
- Reset location-scoped local mutations and dialogs on location changes while preserving navigation, reporting period, selected funnel stage, and prototype interface mode.
- Replace the visible `Prototype` badge and user-facing prototype-only notices with `Demo` terminology.
- Add four unique 1600 by 1200 images per location, with the exterior as cover.
- Keep the current prototype-mode and capability contracts unchanged.
- Keep every reporting comparison positive while preserving irregular chart series and realistically strong funnel conversions.
- Model every message thread explicitly as communication between one named doctor and one patient.

## Explicitly Out Of Scope

- Payload, Supabase, or direct database integration.
- A source-selection environment variable or silent source fallback.
- Authentication, public-route, capability, or deployment configuration changes.
- Persistent user or clinic data.
- An all-locations view or additional location filters.
- Production deployment.

## Access, Data Classification, And Storage

The existing temporary password guard and public-route allowlist remain unchanged. All demo identities, email addresses, telephone numbers, medical descriptions, reviews, and conversations are synthetic. Email addresses use `example.com`; telephone numbers are visibly non-production values. The fixed demo reference time is `2026-07-19T10:00:00.000Z`.

No clinic data is persisted. `.codex/project-profile.toml` remains at `storage.mode = "none"`. Under the superseding demo-experience plan, browser session storage holds only notification read state; interface mode remains internal QA state.

## Architecture

```text
Next.js Server Component page
  -> loadClinicDashboardWorkspaceInput()
     -> demo/loader.ts
        -> demo/dataset.ts
           -> organization-wide values
           -> locationSnapshots[locationId]
  -> ClinicDashboardWorkspace(serializable input)
     -> client-side demo commands
     -> selected location snapshot
```

Runtime demo values live only under `src/features/clinic-dashboard/demo`. Raw values have no public export. Storybook and tests continue to use independent feature-local fixtures. Architecture governance rejects demo imports from components, controllers, stories, tests, shared UI, and app routes other than the named server entry.

The workspace input is explicitly private and provisional. Later Payload and capability planning may replace it. When a second source is introduced, an unknown or failed selected source must surface an error instead of falling back to demo.

## Demo Locations And Reporting

| Location | Profile | Rating | Reviews | Positioning                                       |
| -------- | ------: | -----: | ------: | ------------------------------------------------- |
| İstanbul |     82% |    4.8 |   1,248 | Established flagship with the highest volume      |
| İzmir    |     91% |    4.6 |     486 | Growing location with stronger contact conversion |
| Antalya  |     64% |    4.9 |      92 | Newer lower-volume location with high growth      |

| Location | Period  | Impressions | Profile views | Unique visitors | Contacts | Inquiries |
| -------- | ------- | ----------: | ------------: | --------------: | -------: | --------: |
| İstanbul | 7 days  |       4,680 |           945 |             652 |       27 |         9 |
| İstanbul | 30 days |      18,420 |         3,702 |           2,535 |      104 |        35 |
| İstanbul | 90 days |      53,680 |        10,575 |           7,194 |      295 |       102 |
| İzmir    | 7 days  |       3,140 |           691 |             470 |       22 |         8 |
| İzmir    | 30 days |      12,760 |         2,780 |           1,904 |       91 |        33 |
| İzmir    | 90 days |      35,920 |         7,755 |           5,313 |      250 |        92 |
| Antalya  | 7 days  |       1,260 |           292 |             207 |       10 |         3 |
| Antalya  | 30 days |       4,960 |         1,141 |             804 |       42 |        13 |
| Antalya  | 90 days |      12,840 |         2,928 |           2,051 |      105 |        35 |

Reporting uses identical date axes across locations. Every series is stored as explicit irregular values, sums exactly to its period total, and preserves a monotonic funnel. All visible reporting deltas are positive. Conversion bands remain strong without appearing exceptional: 19–24% impressions to profile views, 67–72% profile views to unique visitors, 4–5.5% unique visitors to contacts, and 30–37% contacts to inquiries.

## Location Content Contract

Each location provides:

- a distinct address, description, opening schedule, specialties, team, treatments, and IDs;
- three conversations, one valid active conversation, three messages, and one matching patient inquiry;
- one named doctor per conversation, referenced from that location’s profile team; message senders are only `doctor` or `patient`;
- six reviews including open, answered, pending-moderation, and appeal flows;
- a review distribution whose total and rounded weighted rating agree with dashboard reputation;
- four unique photorealistic 4:3 images: exterior, reception, treatment room, and corridor or consultation room.

Notifications remain organization-wide and include location ID and readable location metadata. The UI renders the location as ordinary metadata rather than another pill.

## Image Handling

The existing twelve gallery images remain byte-for-byte unchanged and are reassigned to the three Turkish demo locations. Images contain no logos, readable signs, identifiable patients, or sensitive medical scenes. With exactly four images, the gallery action reads `View all images`.

## Test And Acceptance Plan

- Unit: serializability, snapshot completeness, valid notification references, real image count and dimensions, reporting sums, positive deltas, funnel conversion bands, dashboard/review consistency, doctor-to-team references, doctor/patient-only senders, synthetic contact data, general location IDs, and demo import boundaries.
- Storybook: independent cross-feature location-switch journeys, organization notification metadata, Demo badge, four-image gallery action, doctor/patient thread metadata, dark gallery overlays, and 320-pixel layout.
- E2E: location-specific KPIs and content across all areas, preserved reporting selection, reset local mutations, and reload to İstanbul.
- Visual: light dashboard captures before and after switching plus a dark gallery overlay capture.
- Final validation: format check, complete checks, unit tests, Storybook tests, Chromium smoke, Storybook build, Next build, and dependency audit.

## Delivery And Risk

Delivery uses one branch and one pull request for the data, UI behavior, documentation, and tests. A matching reviewer pass may run only after explicit confirmation. No deployment occurs without a separate command. No ADR is added for this data-only evolution.

Primary risks are repository weight from generated images, fixture drift, accidental imports of temporary demo values, and location state leaking across keyed feature facades. Image dimensions, architecture governance, and cross-location tests provide the corresponding safeguards.
