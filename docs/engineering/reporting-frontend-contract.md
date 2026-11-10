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
of reporting. The V3 runtime does not consume historical demo reporting snapshots or fabricate time series. The separate
Workspace VisualReference story explicitly supplies a reporting-demo snapshot through the controlled harness. The normal
workspace entry never supplies this input. The demo uses the existing dashboard controller, screen, period control and
profile-views download adapter. Its synthetic location picker is confined to that explicit demo; normal mode lists only the
authorized clinic.

## Top reporting cards

Normal reporting and the separate demo show public profile completion followed by Open inquiries and the remaining
operational slot. Profile completion retains its existing calculation, information, loading, and unavailable states.

The inquiry domain owns its focused `loadOpenInventory` command. The overview consumes only its validated current
inventory, independently of period, journey stage, queue search, handling filters and personal unread positions.
Loading replaces the number with an accessible skeleton; reduced motion disables its animation. Ready empty results
show `0` and `No open inquiries`. Failure replaces the value with `Unavailable`; Retry reloads only this result.
Normal-mode failures never select synthetic data. The explicit synthetic workspace injects its own command.

Requests and results belong to the authenticated principal and selected clinic. A scope change immediately projects
loading and invalidates delayed results, including access-loss callbacks. The inquiry destination owns the
`open-inventory` list entry: Open, empty search, no handling restrictions and no selected record. It invalidates pending
detail reads and automatic read intent before the mounted destination becomes active. Drafts and pending attachments
remain in the destination controller; normal editor departure protections still apply.

Below `sm`, the three cards stack with profile completion first. From `sm` to below `xl`, profile completion spans the
full first row and the operational slots share the second row equally. From `xl`, all three cards occupy equal-width
columns. The row retains `gap-4` without empty columns or horizontal overflow.

## CSV exports

Dashboard owns the aggregate profile-views CSV serializer and calls the domain-neutral `downloadTextFile` browser adapter. Reviews exposes no download or export capability.

## Four-count content contract

The server selects `clinic-dashboard-reporting-v3` with `X-Findmydoc-Reporting-Contract` while retaining the separate `clinic-scope-v1` protocol. The complete DTO contains impressions, profileViews, uniqueVisitors, inquiries and independent reviews. Source state and numeric value remain bound: available empty measurements are zero, unknown coverage and outages are null. Each count preserves an independent comparison state. The Dashboard performs no source calculations and accepts no V1-shaped substitute.

Unique Visitors counts recognized consent-eligible browser visitors among profile views once per clinic and period, using consent-based browser recognition. Browser/device changes and cleared storage can count a visitor again. Patient, inquiry and session identifiers are not substitutes. Profile Views remains the initial selection; period and section changes preserve a valid selection. Published profile progress is supplied independently and never reconstructed from the reporting DTO.

A retired `inquiryStarters` display preference maps to `profileViews` only after the principal/clinic scope and period
are validated. Its period is preserved. This legacy input key is not a supported reporting metric. Both the normal
journey and synthetic demo render four stages and three order connectors. The demo detail summary has four entries.
The upper profile-completion card and operational inventories are independent of this reporting contract.

The V3 producer and consumer switch directly without V2 compatibility. Server and browser reject old schema versions,
missing required metrics and additional metrics. Existing V2 browser documents can require a reload after delivery.
