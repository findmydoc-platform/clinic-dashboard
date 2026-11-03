# Reporting frontend contract

See [Frontend Architecture](./frontend-architecture.md) for shared rules.

## Reporting controller

The dashboard overview controller owns reporting requests, period and journey selection. Journey stages are presentation
models, separate from supported reporting metric IDs. Selecting an unsupported stage never changes the wire contract or
requests data. The workspace connects its public
controller, screen and period control to the shell's existing header slot. Reporting state survives section navigation and
resets with the workspace's authenticated principal/clinic scope. The authenticated workspace also retains the selected
period and journey stage in tab-scoped session storage for document reloads. Only display preferences and their
principal/clinic scope are stored, never reporting responses or credentials. Server rendering uses the server snapshot;
hydration restores a matching preference and loads fresh data for a different period while showing a loading state.
Unavailable storage leaves the current document's reporting controls usable. Isolated Storybook compositions do not
enable preference persistence. Published profile progress remains the server's atomic
projection; the presentation mapper uses it for both the KPI and task card. Notification refresh and failure are independent
of reporting. The V2 runtime does not consume historical demo reporting snapshots or fabricate time series. The separate
Workspace VisualReference story explicitly supplies a reporting-demo snapshot through the controlled harness. The normal
workspace entry never supplies this input. The demo uses the existing dashboard controller, screen, period control and
profile-views download adapter. Its synthetic location picker is confined to that explicit demo; normal mode lists only the
authorized clinic.

## CSV exports

Dashboard owns the aggregate profile-views CSV serializer and calls the domain-neutral `downloadTextFile` browser adapter. Reviews exposes no download or export capability.

## Five-count content contract

The server selects `clinic-dashboard-reporting-v2` with `X-Findmydoc-Reporting-Contract` while retaining the separate `clinic-scope-v1` protocol. The complete DTO contains impressions, profileViews, uniqueVisitors, inquiryStarters, inquiries and independent reviews. Source state and numeric value remain bound: available empty measurements are zero, unknown coverage and outages are null. Each count preserves an independent comparison state. The Dashboard performs no source calculations and accepts no V1-shaped substitute.

Unique Visitors counts recognized consent-eligible browser visitors among profile views once per clinic and period, using the same recognition as Inquiry starters. Browser/device changes and cleared storage can count a visitor again. Patient, inquiry and session identifiers are not substitutes. Profile Views remains the initial selection; period and section changes preserve a valid selection. Published profile progress is supplied independently and never reconstructed from the reporting DTO.
