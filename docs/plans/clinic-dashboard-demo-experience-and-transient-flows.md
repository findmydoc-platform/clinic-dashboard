# Clinic Dashboard Demo Experience And Transient Flows

> **Approved implementation plan — 2026-07-20.** This plan turns the multi-location foundation into a presentation-ready demo while keeping all new mutations transient and synthetic.

## User Outcome And Audience

Clinic representatives can experience a coherent, interactive workspace during an external product presentation. Notifications lead to the correct location and record, profile edits update the dashboard, doctors can compose local demo messages, inquiry details stay available without implying an undefined workflow, and the support form demonstrates a complete submission state. Every outcome remains visibly a demo and never implies that data was sent or saved.

## Scope

- Keep one generic server-side workspace loader and introduce a private `ClinicDashboardWorkspaceProvider` contract with one current demo implementation.
- Keep the serialized workspace input independent of its technical source.
- Use narrow `ClinicProfileCommands`, `ReviewCommands`, and `MessageCommands` at feature boundaries.
- Rename the presentation capability object to `ClinicDashboardDemoInteractionPolicy` and keep it separate from future live authorization capabilities.
- Make `presentation` the fixed production demo mode without a visible mode switch; retain `visual-reference` and the switch for Storybook and internal QA only.
- Add notification deep links, saved-profile dashboard projection, attachment metadata validation, local message sending, defined inquiry details, and a complete local support-form result.
- Keep Subscriptions and Credentials visible as non-interactive placeholders.
- Keep all changes local to the selected location and reset them on location change or reload.

## Explicitly Out Of Scope

- Payload, Supabase, database access, or a second workspace provider.
- A source selector, environment variable, or silent fallback from a failed live provider to demo data.
- New routes, authentication changes, live authorization-capability strings, or public APIs.
- Durable profile, review, message, inquiry, support, or notification persistence.
- File upload, file content reads, blob URLs, previews, support tickets, appointment booking, patient records, or treatment confirmation.
- Deployment and a new ADR.

## Access, Data Classification, And Storage

The temporary password guard and public-route allowlist remain unchanged. All clinic, staff, patient, review, inquiry, and message values are synthetic demo data. Attachment handling retains only the selected file name, declared MIME type, and byte size in React state. It does not read or upload file contents.

`.codex/project-profile.toml` remains at `storage.mode = "none"`. Notification read IDs are the only workspace state stored in `sessionStorage`. Profile, review, message, inquiry, and support mutations remain in React state and are discarded on reload. Location-scoped mutations are also discarded when the selected location changes.

## Architecture And Data Access

```text
Next.js Server Component page
  -> loadClinicDashboardWorkspaceInput()
     -> ClinicDashboardWorkspaceProvider.loadWorkspace()
        -> current demo provider
  -> ClinicDashboardWorkspace(serializable input)
     -> demo client adapter
        -> narrow feature command contracts
     -> feature controllers
        -> screens and dialogs
```

`loadClinicDashboardWorkspaceInput()` remains the only application-facing data-access entry. The provider contract and `ClinicDashboardWorkspaceInput` are private and provisional. A future server-side selector may choose a Payload provider that returns the same feature-oriented UI models. Unknown sources and provider failures must surface visibly; they must never fall back to the demo provider.

Runtime demo data stays under `src/features/clinic-dashboard/demo`. The app page, feature components, controllers, screens, stories, and fixtures cannot import it. Runtime functions remain client-side in the demo client adapter because functions cannot cross the Server Component boundary. Storybook and tests use independent fixtures and command fakes.

`ClinicDashboardDemoInteractionPolicy` controls demo presentation behavior only. It is not an authorization model and must not be combined with future Payload capabilities such as `clinic-profile:view` or `clinic-profile:edit`.

## Interaction Flows

### Notifications

The full notification row is an accessible interaction target. Opening a notification marks only that item as read, closes the panel, switches to its location, navigates to Messages or Reviews, and announces the destination. Conversation targets select and focus the conversation heading. Review targets reset page and filters, then scroll to and focus the review card without opening a response dialog. Dataset construction rejects unknown location, conversation, and review targets.

### Profile Projection

Only a successful profile save projects the saved clinic name and cover image into the dashboard preview. A saved cover change or team change resolves its corresponding profile task and applies the location-specific completion increment with a fixed cap. Staged, cancelled, or failed changes do not affect the dashboard. Certificate and accreditation tasks are unchanged.

### Messages And Attachments

The composer accepts text, one attachment, or both. Allowed attachment metadata is PNG, JPEG, WebP, or PDF up to 5 MB. Sending is visibly busy for about 300 milliseconds. The demo adapter then appends a doctor-authored local message, clears the draft and attachment, and states that nothing was sent. Storybook owns an independent fail-once command fake for retry behavior.

### Inquiry Details

The inquiry dialog shows only the currently defined contact and treatment-interest details. It has no status, revision, workflow action, or grouping mutation. Conversation grouping remains part of the supplied messages snapshot until a real inquiry workflow is defined.

### Support

Support retains local validation and optional screenshot metadata. A valid submission is busy for about 300 milliseconds and then states that no request was sent or saved. `Create another request`, `Done`, closing, and reopening all return the controller to an empty form. No support command, ticket ID, API route, or recipient is introduced.

## UI And Component Approach

Existing Atomic Design ownership remains unchanged. Workspace orchestration owns cross-feature notification targets and the selected-location reset. Messages and Reviews own their one-shot focus targets. Clinic Profile owns draft and save behavior. Support owns its complete local submission lifecycle. Screens receive view models and semantic actions rather than runtime data or command implementations.

The production route renders the polished `presentation` mode directly. Storybook retains the mode switch only where internal QA needs to compare presentation policy with `visual-reference`. Light and dark modes and a 320-pixel layout remain supported.

## Test And Acceptance Plan

- Unit: provider and import boundaries, complete serialization, notification target validation and read state, profile projection, inquiry-field boundaries, attachment validation, local message outcomes, and support reset.
- Storybook: notification-to-conversation and notification-to-review journeys; profile-task save and dashboard projection; attachment add/remove/send and fail-once retry; defined inquiry details; support validation, busy, result, and reset; keyboard, focus, live status, light/dark themes, and 320-pixel layout.
- E2E smoke: the fixed external presentation mode, one cross-location notification deep link, successful profile-to-dashboard synchronization, and deterministic reload reset.
- No integration suite is added because this change introduces no persistent or network boundary.
- Final local validation: format check, `pnpm check`, complete unit and Storybook tests, Chromium smoke, Storybook build, Next build, and dependency audit.

## Delivery And Risk

The implementation follows the merged multi-location foundation in one branch and one pull request. Reviewers run only after explicit confirmation and are limited to one combined architecture/UI pass. Product Design review is limited to the composer, inquiry details, and their mobile states. Findings are fixed once without another complete reviewer run. GitHub Actions billing failures are not a release signal; local validation is authoritative. No deployment occurs without a separate command.

Primary risks are temporary demo contracts leaking into feature UI, state crossing location boundaries, misleading success language, invalid notification targets, and mobile interaction regressions. Architecture governance, dataset assertions, keyed location facades, explicit demo-only messages, and focused browser journeys provide the corresponding safeguards.
