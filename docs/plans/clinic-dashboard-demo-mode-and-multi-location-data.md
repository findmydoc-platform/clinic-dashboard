# Clinic Dashboard Demo Mode and Multi-Location Data

> **Approved implementation plan — 2026-07-19.** This plan introduces a private demo data source and complete location snapshots without defining the later Payload contract.

## User Outcome And Audience

Clinic administrators can switch among Berlin Mitte, Berlin Charlottenburg, and Potsdam and immediately see a coherent, visibly different workspace for the selected location. The demo is intended for product review and stakeholder demonstrations; it must remain visibly synthetic and must not imply live clinic data.

## Scope

- Add a server loader that returns a private provisional `ClinicDashboardWorkspaceInput` with `dataSource: "demo"`.
- Keep organization, account, treatment catalogue, notifications, subscriptions, and credentials organization-wide.
- Provide location snapshots for dashboard reporting, clinic profile, messages, patient inquiry, and reviews.
- Use general string location IDs and validate selected IDs against the supplied location list.
- Reset location-scoped local mutations and dialogs on location changes while preserving navigation, reporting period, selected funnel stage, and prototype interface mode.
- Replace the visible `Prototype` badge and user-facing prototype-only notices with `Demo` terminology.
- Add four unique 1600 by 1200 images per location, with the exterior as cover.
- Keep the current prototype-mode and capability contracts unchanged.

## Explicitly Out Of Scope

- Payload, Supabase, or direct database integration.
- A source-selection environment variable or silent source fallback.
- Authentication, public-route, capability, or deployment configuration changes.
- Persistent user or clinic data.
- An all-locations view or additional location filters.
- Production deployment.

## Access, Data Classification, And Storage

The existing temporary password guard and public-route allowlist remain unchanged. All demo identities, email addresses, telephone numbers, medical descriptions, reviews, and conversations are synthetic. Email addresses use `example.com`; telephone numbers are visibly non-production values. The fixed demo reference time is `2026-07-19T10:00:00.000Z`.

No data is persisted. `.codex/project-profile.toml` remains at `storage.mode = "none"`. Browser session storage continues to hold only the already approved interface mode and notification read state.

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

## Demo Locations

| Location       | Profile | Rating | Reviews | Positioning                                       |
| -------------- | ------: | -----: | ------: | ------------------------------------------------- |
| Mitte          |     82% |    4.8 |   1,248 | Established flagship with the highest volume      |
| Charlottenburg |     91% |    4.6 |     486 | Growing location with stronger contact conversion |
| Potsdam        |     64% |    4.9 |      92 | Newer lower-volume location with high growth      |

Reporting uses identical date axes across locations. Every series is stored as explicit irregular values, sums exactly to its period total, and preserves a monotonic funnel.

## Location Content Contract

Each location provides:

- a distinct address, description, opening schedule, specialties, team, treatments, and IDs;
- three conversations, one valid active conversation, three messages, and one matching patient inquiry;
- six reviews including open, answered, pending-moderation, and appeal flows;
- a review distribution whose total and rounded weighted rating agree with dashboard reputation;
- four unique photorealistic 4:3 images: exterior, reception, treatment room, and corridor or consultation room.

Notifications remain organization-wide and include location ID and readable location metadata. The UI renders the location as ordinary metadata rather than another pill.

## Image Direction

- Mitte: urban flagship with warm wood and pale stone.
- Charlottenburg: calm, refined historic context.
- Potsdam: smaller bright setting with natural greenery.

Images contain no logos, readable signs, identifiable patients, or sensitive medical scenes. With exactly four images, the gallery action reads `View all images`.

## Test And Acceptance Plan

- Unit: serializability, snapshot completeness, valid notification references, real image count and dimensions, reporting sums, funnel order, dashboard/review consistency, synthetic contact data, general location IDs, and demo import boundaries.
- Storybook: cross-feature Charlottenburg journey, standalone Potsdam journey, organization notification metadata, Demo badge, four-image gallery action, dark gallery overlays, and 320-pixel layout.
- E2E: location-specific KPIs and content across all areas, preserved reporting selection, reset local mutations, and reload to Mitte.
- Visual: light dashboard captures before and after switching plus a dark gallery overlay capture.
- Final validation: format check, complete checks, unit tests, Storybook tests, Chromium smoke, Storybook build, Next build, and dependency audit.

## Delivery And Risk

Delivery uses one branch and one pull request for the loader, data, assets, architecture rules, UI behavior, and tests. A single combined architecture and product-design review may run only after explicit confirmation. No deployment occurs without a separate command.

Primary risks are repository weight from generated images, fixture drift, accidental imports of temporary demo values, and location state leaking across keyed feature facades. Image dimensions, architecture governance, and cross-location tests provide the corresponding safeguards.
