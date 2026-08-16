# Clinic Gallery Management

## Status and Dependencies

This plan covers [Clinic Dashboard #100](https://github.com/findmydoc-platform/clinic-dashboard/issues/100).
Implementation depends on the focused Website gallery contract from
[Website #1619](https://github.com/findmydoc-platform/website/issues/1619). Website PR #1704 is merged
at `6947bde4642e7a3cc257658bd5bc79295b266027`, and Website #1619 is closed. The Dashboard adapter and
tests have been revalidated against the final focused route, DTO, error, upload-limit, revision, and
cleanup contracts on Website `main`.

The former Clinic Dashboard gallery was fixture-backed. Its mosaic remains the visual reference for
the profile overview, while the source-backed management workflow owns gallery order, metadata, and
the public main image independently from the legacy profile-save path.

## User Outcome and Audience

Authenticated clinic staff can manage the public profile gallery for their server-assigned clinic.
They can upload images, provide accessible metadata, choose the main image, arrange the public order,
remove images, correct staged removals, and save one consistent gallery revision.

Staff with `clinic-gallery:view` can inspect the saved gallery. Management actions require
`clinic-gallery:edit`. Platform staff continue to use Payload Admin rather than a separate Dashboard
workflow.

## Access, Data, and Storage Decisions

- Clinic identity is derived from the verified server-side session and Website bootstrap. Browser
  input never selects a clinic.
- The browser uses same-origin Dashboard endpoints only. It receives no Payload credentials,
  object-storage credentials, bucket identifiers, direct upload URLs, or upstream media URLs.
- Published gallery images, alt text, captions, order, and main-image selection are public clinic
  profile data.
- Newly uploaded media remain private clinic-owned drafts until the gallery is saved.
- Unsaved ordering, metadata, removal, and upload-queue state is ephemeral browser state. There is no
  persistent Dashboard edit session, auto-save, or resumable gallery draft.
- Payload and its configured storage adapter remain the only persistence and deletion boundary. The
  Dashboard adds no database or storage access.
- All Dashboard gallery responses are private and non-cacheable. Public Website cache invalidation
  remains owned by the Website gallery service after a successful commit.

## Scope

The Dashboard implementation includes:

- source-backed saved-gallery loading with an independent loading, ready, empty, and unavailable
  state;
- a profile-overview mosaic for zero, one, two-to-four, and five-to-twelve images;
- individual image uploads with a multi-file queue, while sending no more than three requests in
  parallel and never exceeding the remaining gallery capacity;
- visible accepted formats, maximum file size, image-count limit, and concrete per-file errors;
- automatic placement of successful uploads at the end of the local gallery order;
- required alt text before save and optional caption text;
- an explicit `Set as main image` action that moves the selected item to position one without
  changing the relative order of the other items;
- pointer and keyboard-accessible ordering controls;
- staged removal with undo before save;
- an explicit save using the loaded revision, and an explicit cancel that restores the saved
  gallery and discards newly uploaded private drafts;
- a destructive confirmation only when the save removes previously published images; ordering,
  main-image, alt-text, and caption-only saves do not require a second confirmation;
- revision-conflict, validation, upload, save, and service-unavailable recovery without silently
  losing local values;
- read-only gallery inspection when view access exists without edit access;
- responsive, keyboard-accessible Light and Dark behavior with Storybook coverage.

## Explicitly Out of Scope

- before-and-after images, treatment results, or medical outcome imagery;
- `clinicGalleryEntries`, `clinicGalleryMedia`, or `Clinics.galleryEntries`;
- cropping, rotation controls, filters, retouching, automatic enhancement, or other image editing;
- a general media library, reuse across clinics, doctor images, or file management;
- direct browser uploads to Payload or object storage;
- persistent gallery edit sessions, locks, merge tools, or concurrent collaborative editing;
- Dashboard ownership of physical media cleanup, cache revalidation, or public clinic-detail UI;
- multiple clinic locations, clinic chains, or cross-location galleries;
- bulk removal. Multi-file selection is limited to upload convenience.

## Interaction Contract

### Profile Overview

The existing rounded mosaic remains at the top of the clinic profile. It is a summary and entry
point, not the editing surface.

- The first saved image is visually dominant and represents the public main image.
- Up to five images are previewed. One to five saved images use adaptive layouts without empty
  placeholders, and the main image always remains the largest tile.
- An empty gallery shows a calm placeholder and an add action only when edit access exists.
- Read-only users can open the saved gallery but never see management controls.
- Profile editing and gallery management are separate tasks. The gallery action is hidden while the
  profile form is being edited.
- Gallery loading or failure does not block the independently source-backed profile, doctors, or
  treatments areas.

### Gallery Manager

The gallery manager owns one local working copy of the saved gallery and its revision. It provides:

- the current image count and maximum of twelve;
- add-image access until the local capacity is exhausted;
- an unambiguous main-image marker on the first item;
- direct main-image selection, ordering, metadata editing, removal, and undo;
- a compact horizontal order strip, top-aligned focused preview, and metadata inspector;
- drag ordering with arrow-key support plus secondary move and remove actions in a compact menu;
- clear unsaved-change status and an explanation that saving updates the public clinic profile
  immediately when the clinic is public;
- `Back to profile` and `Save and return` actions that remain reachable on narrow and short
  viewports.

Closing or navigating away with unsaved changes opens a leave guard. Keeping edits returns to the
manager. Discarding restores the saved gallery and asks the server to discard newly uploaded draft
media. A failed discard does not pretend that cleanup succeeded; the Website cleanup contract may
retry abandoned drafts later.

### Upload Queue and Metadata

One file-picker or drop action may select up to the remaining gallery capacity. Files are queued and
sent as individual requests, with at most three active uploads. Each item independently shows
waiting, uploading, uploaded, retryable error, or rejected status.

Successful uploads are appended to the local order and selected in the same continuous editor;
there is no separate skip-or-finish metadata step. Alt text may be entered after upload, but save is
blocked until every selected gallery item has non-empty alt text. Caption text remains optional.
Unsupported formats, oversized files, excessive pixel dimensions, capacity overflow, and server
failures produce specific, local messages without cancelling successful sibling uploads.

The UI does not promise byte-level progress unless the selected browser transport can provide it
reliably. A determinate busy state is sufficient.

### Removal and Save

Removing an item stages it outside the public-order list and exposes undo until save or cancel. If a
main image is removed, the next ordered image becomes the local main image; an empty gallery is
valid.

Saving ordinary changes uses one explicit operation. If previously published images are staged for
removal, a confirmation lists the affected count and explains that the images will be removed from
the public gallery and permanently deleted after the commit. The confirmation is not shown for
metadata, order, or main-image-only changes.

The manager closes only after a definitive successful save. Validation and availability failures
keep local edits visible. A revision conflict keeps the local working copy visible and copyable,
blocks another blind save, and offers a confirmed reload of the latest saved gallery. Automatic
merging is out of scope.

## Dashboard Architecture

The gallery becomes an approved live domain in the existing provider composition:

- a serializable gallery snapshot and mutation model;
- a server-only provider contract for load, upload, save, and draft discard;
- controlled and Website-backed provider implementations selected centrally;
- same-origin BFF routes for snapshot/save, one multipart media upload, draft discard, and private
  media streaming through an opaque authenticated-encryption token;
- a browser command adapter with strict response validation;
- a gallery controller that owns the working copy, upload queue, removal undo, revision, conflict,
  validation, and leave-guard transitions;
- pure model functions for order changes, main-image selection, capacity, dirty comparison, and
  save serialization.

The existing `ClinicProfileGallery` remains the overview organism. The current `GalleryDialog` is
too narrow for the complete responsibility and is replaced by a gallery-manager organism composed
from focused upload, image-card or inspector, metadata, removal, and action components. Exact
component composition follows the selected Product Design direction.

Provider failures remain visible in the gallery area and never fall back to fixture images.
Controlled mode may use explicit process-local test state, but Preview and Production must use the
Website-backed provider.

## Required View Matrix

Product Design and Storybook must cover four coherent view groups:

1. **Profile overview**: populated mosaic, one image, empty editable, empty read-only, loading, and
   unavailable.
2. **Gallery manager**: populated default, twelve-image capacity, main-image change, reordered,
   metadata editing, staged removal, and mobile actions.
3. **Upload workflow**: queued files, three active uploads, mixed success and failure, invalid file,
   capacity reached, missing alt text, and retry.
4. **Save and recovery**: ordinary save, destructive-removal confirmation, save failure, revision
   conflict, leave guard, discard failure, and definitive success.

States may share one component surface; they do not require four production routes.

## Product Design Exploration

Before UI implementation, Product Design produces exactly three coherent directions. Each direction
shows all four required view groups as a single multi-frame board, including desktop and mobile
behavior. This yields twelve comparable frames while preserving one consistent interaction model
per direction.

### Direction A: Gallery Board

Closest to the existing visual language. A large grid-first manager uses image cards with inline
status and compact metadata editing. It favors direct manipulation and makes ordering visually
obvious.

### Direction B: Image Inspector

A split manager uses an ordered thumbnail rail or grid beside one focused image preview and metadata
inspector. It favors careful alt-text and caption work while keeping the complete order visible.

### Direction C: Guided Curation

A small sequence separates upload, describe, and arrange/review stages while preserving the same
local working copy. It favors first-time clarity and error prevention at the cost of additional
navigation.

### Selected Direction: Compact Image Inspector

The implemented direction uses Direction B as its base and incorporates the approved simplification
work. The profile overview uses adaptive one-to-five-image compositions with a visually dominant
main image. The manager uses one horizontal order strip, a top-aligned focused image, and a compact
metadata inspector. Uploads remain in this editor, missing alt text blocks save, secondary order and
removal actions live in one menu, and successful save returns to the profile with a floating toast.

All directions retain the current profile mosaic, existing typography, tokens, components, restrained
radius, Light/Dark support, and text-light findmydoc Dashboard character. The visual exploration may
vary manager layout and interaction density, but it must not invent capabilities outside this plan.

## Test and Acceptance Plan

- Pure unit tests cover capacity, append order, duplicate prevention, main-image moves, stable
  relative ordering, removal and undo, empty galleries, dirty comparison, validation, and save DTOs.
- Controller tests cover upload concurrency, mixed upload outcomes, retry, cancel and draft discard,
  destructive confirmation, save success, definitive failure, unknown outcome handling, and
  revision conflict without local-value loss.
- Provider and route tests cover session-derived clinic scope, exact capabilities, CSRF, private
  headers, multipart limits, response validation, stable Website error mapping, and absence of
  Payload or storage credentials in browser responses.
- Contract tests prove the Dashboard DTO and error mapping against the final Website #1619 contract.
- Storybook browser tests cover the complete view matrix, keyboard ordering, focus restoration,
  status announcements, validation association, and no destructive action by backdrop dismissal.
- Focused authenticated Playwright coverage proves load, mixed multi-upload, metadata, reorder,
  main-image selection, removal and undo, destructive save, reload, and conflict recovery.
- Visual evidence includes desktop and mobile Light screenshots for the selected direction. Dark
  screenshots are additionally required because image overlays, status colors, dialogs, and sticky
  actions are affected.
- Validation runs formatting, project checks, relevant unit and integration tests, Storybook tests,
  end-to-end tests, and the production build.

## Delivery and Reviewer Gate

1. Implement against the agreed Website #1619 contract.
2. Verify the final merged Website route, DTO, error, upload-limit, cleanup, and revision contracts.
   Contract drift updates both repositories before Dashboard delivery. Completed against Website
   merge `6947bde4642e7a3cc257658bd5bc79295b266027`.
3. Generate exactly three Product Design boards and wait for the selected direction.
4. Implement the selected UI and live-domain integration without changing deployment configuration.
5. Capture responsive Light and Dark evidence and complete local validation.
6. Run `pnpm review:route --base origin/main --format json`, present every recommended and omitted
   reviewer with its routing reason, and obtain one explicit approval before reviewer execution.
7. Present all deduplicated findings before any reviewer-driven fix or delivery decision.
8. Deliver one Clinic Dashboard pull request that closes #100.

## Risks

- The focused Website and Dashboard contracts can drift in later changes. Strict response parsing,
  stable error-mapping tests, and coordinated contract updates keep that boundary explicit.
- Upload success precedes gallery save, so cancel, navigation, and failure paths must reliably
  request draft discard without claiming guaranteed immediate physical cleanup.
- Permanent post-commit deletion makes removal materially destructive. The conditional confirmation
  and staged undo are required safeguards.
- Drag-only ordering would fail keyboard and mobile users. Every direction needs non-drag ordering
  controls.
- A gallery-level conflict cannot be solved safely by blind retry. Local edits remain available, but
  reload is explicit and destructive.
- Image-heavy dialogs can overflow short viewports or hide actions. Sticky actions, bounded media,
  and mobile evidence are acceptance requirements.
