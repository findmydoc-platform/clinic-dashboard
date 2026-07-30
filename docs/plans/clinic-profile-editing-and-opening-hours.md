# Clinic Profile Editing and Opening Hours

## Outcome

Clinic staff can inspect the published profile for their server-assigned clinic, deliberately enter
an edit mode, save a persistent private draft, resume or discard it, review the exact changes, and
publish it. Draft saves never change public clinic data. The editable surface is limited to the
clinic name, plain-text description, supported languages, public postal address, and structured
Monday-to-Sunday opening hours.

The existing gallery, doctor directory, and treatment modules remain visible and behaviorally
unchanged. They are not part of the profile draft, dirty comparison, save, discard, or publish
operations.

## Audience, Access, and Data

- The audience is authenticated clinic staff with `clinic-profile:view`; edit actions additionally
  require `clinic-profile:edit`.
- The dashboard derives the clinic identity from the verified server-side session and Payload
  bootstrap. Browser requests never select a clinic or country.
- Payload remains the source of truth. The dashboard does not access a database directly and does
  not use service-role credentials.
- Published clinic fields are public profile data. The active draft is private clinic-owned data
  and is returned only to staff assigned to the same clinic.
- Existing coordinates are excluded from all dashboard DTOs and mutations.
- No product analytics, activity history, audit history, or future version-history mechanism is
  introduced.

## Website Contracts

The implementation depends on:

1. Website #1625 storing `zipCode` as text without country-specific normalization.
2. Website #1626 using country and city relationships restricted to Türkiye for the current clinic
   flow.
3. Website #1624 providing one active clinic profile draft, optimistic revision checks, atomic
   publish, draft removal, and existing public cache revalidation.

Opening hours use the Website #1528 contract: an optional complete Monday-to-Sunday schedule with
`isClosed`, `opensAt`, and `closesAt`; configured times use local 24-hour `HH:mm` values and closed
days contain no times.

## Dashboard Contract

`ClinicProfileSnapshot` contains the published editable values and revision, an optional active
draft with its revision and published base revision, and safe Turkish city options.

The server provider owns `loadSnapshot`, `saveDraft`, `discardDraft`, and `publishDraft`. Initial
page loading and the same-origin BFF use the same composed provider. The browser uses:

- `GET /api/dashboard/profile`
- `PUT /api/dashboard/profile/draft`
- `POST /api/dashboard/profile/draft/discard`
- `POST /api/dashboard/profile/publish`

Mutations validate CSRF, derive authorization and clinic identity server-side, send expected
revision values, and return private non-cacheable responses. Conflicts return `409` and never
overwrite newer data.

## Interaction Contract

- Read mode uses normal typography and information groups, never disabled form controls.
- Without a draft, `Edit profile` starts a local working copy.
- With a draft, published values remain visible with `Draft available`, `Published profile is
shown`, and `Continue editing`.
- Dirty edit mode offers `Cancel editing` and `Save draft`.
- A clean persisted draft offers `Discard draft` and `Review & publish`.
- Leaving dirty edit mode requires an alert dialog with `Keep editing`, `Leave without saving`, and
  `Save draft and leave`.
- Discard and destructive conflict reload use alert dialogs without a close icon or backdrop
  dismissal.
- The address dialog edits street, house number, Turkish city, and postal code. Türkiye is visible
  fixed context, not an input.
- The opening-hours dialog always renders the seven ordered days and distinguishes an absent
  schedule from a configured all-closed week.
- Incomplete but structurally valid values may be saved as a draft. Publish validation remains
  authoritative on the Website.

An unchanged Payload rich-text description is preserved exactly. The dashboard displays a
plain-text projection; only an explicitly edited description is converted into canonical plain
text paragraphs.

## Publish Review

The accepted visual references are screens `01` through `09` and refined screen `13` under the
temporary `findmydoc-clinic-profile-102` mockup directory. They define the new profile states only;
AI variation in existing dashboard elements is not authoritative.

The review dialog lists only changed fields and counts changed fields and affected sections.
Text values use the shared `InlineTextDiff` component backed by `diffChars`. Address, language, and
opening-hour values use structured before/after presentation. Publishing happens directly from
this dialog without a second confirmation.

Successful publication closes the dialog, removes the draft, shows the new published values, and
announces a short success toast. A definitive failure keeps the review open. An unknown network
outcome reloads the snapshot before another publish attempt. A conflict closes the stale review
and returns to the edit conflict state.

## Failure and Accessibility Requirements

- An unavailable authoritative profile never falls back to fixture profile values. Gallery,
  doctors, and treatments remain usable.
- Conflict state keeps local values visible and copyable while save and publish are blocked.
- Validation uses a summary plus field-associated errors and never relies on color alone.
- Dialogs restore focus. Async save, publish, conflict, and failure states are announced.
- Light and dark themes, keyboard navigation, narrow mobile layout, short viewport height, and
  sticky action overlap are verified.

## Test and Delivery Evidence

- Unit tests cover profile state transitions, dirty detection, validation mapping, diff grouping,
  field counts, and opening-hour behavior.
- Route and provider tests cover authorization, clinic scoping, CSRF, private responses, revision
  conflicts, Turkish city constraints, postal-code preservation, and coordinates remaining absent.
- Storybook browser tests cover published, draft, editing, dialogs, guards, validation, conflict,
  load failure, and publish review states.
- Focused Playwright coverage proves save, reload/resume, discard, and publish through a controlled
  authenticated session.
- Handoff includes light and dark visual evidence and a narrow mobile check. The PR closes Clinic
  Dashboard #102 and does not change deployment configuration.
