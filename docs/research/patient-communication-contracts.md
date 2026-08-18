# Patient Communication Contract Reconciliation

Research baseline: Clinic Dashboard `5ff3602ed01b48264324c6c1333b7c8f31858d54`, Website
`bbde54290292a2c96dd9b7173e7527abcd0e027a`, and the live issue state rechecked on 2026-08-19.

## Outcome

The product boundary is already decided. The remaining gaps are cross-repository contract details, not new product
choices. They can be closed with the defaults below without opening an implementation item or deciding the later
error/recovery UI.

The core contract should be: Website/Payload owns one tenant-safe Inquiry aggregate and its focused APIs; the Website
patient surface and Clinic Dashboard consume purpose-specific projections of that aggregate. The Dashboard browser
continues to use only capability-specific same-origin BFF routes. Raw Payload documents, collection paths, actor IDs,
clinic IDs, patient IDs, and direct file URLs never become browser authority.

## Confirmed current facts

1. `PatientClinicInquiries` is currently a one-off submission record. It has clinic and contact data, the immutable
   original message/consent evidence, and one combined status enum (`submitted`, `in_review`, `contacted`, `closed`,
   `spam`). It has no patient relation, conversation relation, lifecycle field, participant read state, message,
   internal-note, or private-attachment model. Clinic staff can read only their own clinic's records and can change only
   the current status; consent and platform assignment stay private. Sources:
   [collection](https://github.com/findmydoc-platform/website/blob/bbde54290292a2c96dd9b7173e7527abcd0e027a/src/collections/PatientClinicInquiries.ts),
   [permission tests](https://github.com/findmydoc-platform/website/blob/bbde54290292a2c96dd9b7173e7527abcd0e027a/tests/unit/access-matrix/patientClinicInquiries.permission.test.ts),
   [domain issue](https://github.com/findmydoc-platform/website/issues/1530).

2. The public inquiry route accepts contact data without resolving a patient session, performs a best-effort 15-minute
   fingerprint deduplication, and creates only the Inquiry. It returns the Inquiry ID and current status. This cannot
   guarantee the decided atomic one-Inquiry/one-Conversation invariant for authenticated patients. Source:
   [current submission route](https://github.com/findmydoc-platform/website/blob/bbde54290292a2c96dd9b7173e7527abcd0e027a/src/app/api/clinic-contact-requests/route.ts).

3. The Dashboard's live provider can load up to 100 Inquiries sorted by creation time and can change the combined
   status. Its DTO has no patient-binding, lifecycle, revision, latest-activity, unread, conversation, internal-note, or
   attachment fields. The current BFF exposes only `PATCH /api/dashboard/inquiries/:id/status`; the server-rendered
   queue is loaded through the provider. Sources:
   [provider contract](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/server/patient-inquiry-provider.ts),
   [Payload adapter](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/server/payload-inquiries.ts),
   [BFF mutation](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/server/actions.ts),
   [current Inquiry model](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/model/inquiries.ts).

4. The separate Dashboard Messages surface is still fixture/local-state shaped. Its message and attachment types do not
   constitute a persistence or transport contract. The browser status adapter also collapses every non-success response
   to one generic error, although the BFF already emits distinct safe codes. Sources:
   [Messages model](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/model/messages.ts),
   [browser status adapter](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/messages/browser/inquiry-status-api.ts).

5. The accepted architecture already fixes ownership: Payload is the only business-data and authorization boundary;
   the Dashboard has no database; server-rendered reads use a server-only domain provider; browser interactions use
   capability-specific same-origin routes; private data is `private, no-store`; actor and clinic are always derived
   server-side. A generic Payload proxy and browser-to-Payload access are rejected. Sources:
   [Website ADR 026](https://github.com/findmydoc-platform/website/blob/bbde54290292a2c96dd9b7173e7527abcd0e027a/docs/adrs/026-adr-standalone-clinic-dashboard-bff-architecture.md),
   [Dashboard BFF contract](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/docs/authentication-and-bff.md).

6. The current bootstrap is a closed six-capability union and contains no Inquiry capability. New values must be added
   synchronously across Website bootstrap, Dashboard parsing/behavior, and permission tests. Sources:
   [Website bootstrap](https://github.com/findmydoc-platform/website/blob/bbde54290292a2c96dd9b7173e7527abcd0e027a/src/features/clinicDashboard/bootstrap.ts),
   [Dashboard auth schema](https://github.com/findmydoc-platform/clinic-dashboard/blob/5ff3602ed01b48264324c6c1333b7c8f31858d54/src/features/clinic-dashboard/auth/model/auth.ts).

## Contracts already decided

These are not open gaps and should not be re-decided in implementation:

- A Conversation is Inquiry-bound; there are no free direct messages. Only an authenticated, server-bound patient gets
  chat. Guest Inquiries stay in the clinic queue but have no patient chat. All eligible clinic staff may read and reply;
  there is no personal assignment, priority, or SLA queue. Source: [Wayfinder map](https://github.com/findmydoc-platform/management/issues/360).
- Handling status and lifecycle are separate. Handling is `Submitted`, `In review`, `Contacted`, or `Spam`; lifecycle is
  `Open` or `Closed`. Spam forces Closed. Only the clinic closes or reopens, and reopening continues the same thread.
  A successful clinic reply changes `Submitted`/`In review` to `Contacted`; patient activity does not change handling
  status. Source: [Dashboard workspace decision](https://github.com/findmydoc-platform/management/issues/363).
- The original submission remains immutable Inquiry evidence and is displayed as separate Inquiry context, not copied
  into the chat timeline as its first external message. Source:
  [Dashboard workspace decision](https://github.com/findmydoc-platform/management/issues/363).
- External messages and internal notes are immutable in normal use and limited to 3,000 plain-text characters. Internal
  notes are technically separate, clinic-only, and remain allowed for Guest, Closed, and Spam Inquiries. Source:
  [Dashboard workspace decision](https://github.com/findmydoc-platform/management/issues/363).
- An external message may contain at most one private PNG, JPEG, WebP, or PDF up to 5 MB, and attachment-only messages
  are allowed. Upload and send are separate states; retry must be idempotent; an unreferenced private draft has a
  24-hour safety period. Source: [Dashboard workspace decision](https://github.com/findmydoc-platform/management/issues/363).
- Unread is personal. Opening successfully loaded current activity in a visible active tab marks it read; background
  polling does not. There are no patient-visible read receipts. V1 polls instead of using Realtime, WebSockets, push, or
  browser notifications. Sources: [Wayfinder map](https://github.com/findmydoc-platform/management/issues/360),
  [Dashboard workspace decision](https://github.com/findmydoc-platform/management/issues/363).
- The approved Website patient UI and Dashboard workspace already define the required visible states and information
  architecture; the present work only supplies their data/command contracts. Sources:
  [Website UI resolution](https://github.com/findmydoc-platform/management/issues/361#issuecomment-5324558309),
  [Dashboard UI resolution](https://github.com/findmydoc-platform/management/issues/363#issuecomment-5334272967).

## Recommended resolution of the genuine contract gaps

### 1. Canonical aggregate and state

- Inquiry remains the aggregate root. Persist `handlingStatus`, `lifecycle`, an opaque `revision`, `latestActivityAt`,
  patient binding, and the original immutable submission evidence on/behind that aggregate.
- A patient-bound Inquiry owns exactly one Conversation through a unique Inquiry relation. A Guest Inquiry owns none and
  exposes `conversationAvailability: "guest_no_chat"`. Do not create a dormant Guest Conversation and do not infer
  ownership from email.
- Conversation openness is derived from Inquiry lifecycle and Spam state; do not persist an independently mutable second
  lifecycle. The API may project `canReply`, but it must not accept an independent Conversation close/open mutation.
- Store external messages, internal notes, lifecycle/handling events, and participant read positions as distinct
  records/types under the aggregate. A participant read position should identify the last seen activity, not add a
  global `isRead` flag to messages.
- For an authenticated inquiry submission, derive the patient from the verified session and atomically create the
  Inquiry, patient binding, and its unique Conversation. Use a client-generated idempotency key as the exactly-once
  submission boundary. The existing email/fingerprint window may remain only as guest duplicate mitigation; it is not
  identity or ownership.

### 2. Authorization and capability projection

- Add `clinic-inquiries:view` and `clinic-inquiries:edit` to the closed bootstrap union. Under the current product rule,
  every approved clinic staff principal with a current clinic receives both. Keeping two explicit capabilities aligns
  the UI projection with the existing profile/treatment/gallery convention without inventing roles or queues.
- Every focused endpoint still re-resolves the current principal and clinic and authorizes the exact aggregate/action.
  The two bootstrap values control feature visibility only. Request bodies never contain an authoritative clinic,
  patient, sender, or staff actor.
- Each Clinic detail DTO returns state-derived action flags (`canReply`, `canAddInternalNote`,
  `canChangeHandlingStatus`, `canChangeLifecycle`, `canViewContactData`) so Closed, Spam, Guest, and revoked-access
  behavior cannot diverge between frontend copies.
- Patient endpoints resolve the Patient from the current Website session and expose only that Patient's bound Inquiries.
  Internal notes, staff identity, audit relations, moderation reasons, and clinic-only processing events are absent from
  patient DTOs. A foreign or no-longer-visible aggregate returns the same non-disclosing `404` as a missing one.

### 3. Focused API and BFF boundaries

- Website owns one server-only Inquiry/Conversation domain service and two purpose-specific API projections: a clinic
  contract under `/api/clinic-dashboard/inquiries/**` for the Dashboard server, and a patient contract under
  `/api/patient/inquiries/**` for the Website's authenticated patient surface. Both reuse the same invariants; neither
  exposes raw Payload collection responses.
- The Clinic Dashboard mirrors browser-needed operations under `/api/dashboard/inquiries/**`. React Server Components
  call its private provider directly; Client Components call only these same-origin routes. The provider targets the
  focused Website endpoints rather than composing a multi-collection transaction from generic Payload REST.
- Clinic list reads return keyset-paginated `InquirySummaryDTO` records sorted by
  `(latestActivityAt DESC, inquiryId DESC)`, plus an opaque next cursor. A summary contains the Inquiry reference,
  patient display/binding state, requested treatment/doctor summary, `handlingStatus`, `lifecycle`, latest-activity
  kind/time/safe preview, personal unread count, and aggregate revision. Filters/search are server inputs and are bound
  into the opaque cursor.
- Clinic detail reads return the summary plus immutable Inquiry/contact context, the paginated clinic timeline, current
  action flags, and revision. The clinic timeline may contain external messages, internal notes, and clinic-visible
  system events, each as a discriminated DTO. Attachment metadata contains an authorized same-origin download handle,
  never an upstream URL.
- Patient list/detail DTOs contain clinic display context, Inquiry context, lifecycle, latest activity, personal unread,
  and external messages/attachments only. They omit clinic handling status unless it has an explicitly patient-visible
  meaning; V1 needs only Open/Closed. Message senders project as `clinic` or `patient`; the concrete clinic employee
  remains audit-only.

### 4. Mutation and concurrency contract

The focused contracts need these semantic commands; route spelling may follow repository conventions, but their input
and result shapes are shared and version-controlled:

- send external message;
- add internal note (clinic only);
- change handling status;
- close, reopen, mark Spam, or remove Spam;
- mark personally read or unread;
- create/discard an attachment draft and stream an authorized attachment.

All write bodies are strict and size-bounded. Status/lifecycle commands carry `expectedRevision`; a mismatch returns a
safe current revision/state with `409`, never silently overwriting another staff action. Message, note, and submission
commands carry an idempotency key scoped to actor and aggregate, so a retry returns the original result without adding
another activity. A successful clinic external message and the automatic `Submitted`/`In review` to `Contacted`
transition commit atomically. Closing never reopens on send; a send against changed lifecycle fails with conflict and
leaves the local draft to the client. Read/unread mutations never change `latestActivityAt` or list ordering.

### 5. Attachment contract

- Upload is two-phase: create one private actor-owned draft using multipart input, then reference its opaque draft ID in
  the external-message command. The message transaction verifies owner, aggregate, MIME from file content, extension,
  size, unconsumed state, and current authorization before consuming the draft.
- Message send atomically binds the draft to the new external message. Reusing an already-consumed draft with the same
  idempotency key returns the original message; using it in any other command is a conflict.
- Download/preview always re-authorizes the current participant. The Dashboard BFF streams through a same-origin opaque
  handle, following the already-approved private gallery pattern; the Website patient origin does the equivalent for
  the patient. Cache behavior remains private/no-store.
- Discard is explicit and non-blocking. Unreferenced drafts are eligible for bounded event-driven cleanup only after the
  decided 24-hour safety period. Retention after a message is sent remains owned by the separate governance decision.

### 6. Polling contract

- Both clients use the same semantic change protocol: list and selected-detail responses return an opaque
  `nextPollCursor`; a later read with that cursor returns changed summaries/activities plus removals and a replacement
  cursor. Cursors are server-issued and ordered by stable activity identity, not client clocks.
- Default interval: 15 seconds while the document is visible and online. Pause while hidden/offline; refresh immediately
  on focus, reconnect, successful mutation, and explicit retry. Back off only under the later error/recovery policy.
- Polling never marks content read. The explicit read command is sent only after the selected detail has loaded through
  its latest cursor in a visible active tab. A removal caused by revoked access or deletion closes the detail and clears
  local drafts, as already decided for the workspace.
- No poll response enters a shared cache. Empty deltas may use a private conditional response, but the client always
  advances only with a valid server cursor.

### 7. Stable error boundary

Website endpoints and Dashboard providers/BFF routes should use a closed semantic error union and preserve HTTP class
without forwarding raw Payload/Supabase bodies:

| Condition                                                                                 | HTTP | Safe semantic result                                             |
| ----------------------------------------------------------------------------------------- | ---: | ---------------------------------------------------------------- |
| Invalid body, cursor, text, or state value                                                |  400 | `INQUIRY_INVALID_INPUT`                                          |
| Missing/invalid patient or staff session after the existing refresh rule                  |  401 | `INQUIRY_UNAUTHORIZED`                                           |
| Valid principal without feature/action capability; local CSRF/origin rejection            |  403 | `INQUIRY_ACCESS_DENIED` / existing `REQUEST_REJECTED`            |
| Missing, foreign, deleted, or no-longer-visible aggregate                                 |  404 | `INQUIRY_NOT_FOUND`                                              |
| Stale revision, Closed/Spam reply, consumed attachment, or incompatible concurrent change |  409 | typed `INQUIRY_CONFLICT` reason plus safe current revision/state |
| File exceeds 5 MB                                                                         |  413 | `INQUIRY_ATTACHMENT_TOO_LARGE`                                   |
| File content/type is not allowed                                                          |  415 | `INQUIRY_ATTACHMENT_TYPE_UNSUPPORTED`                            |
| Explicit server rate limit                                                                |  429 | `INQUIRY_RATE_LIMITED` with `Retry-After` when known             |
| Malformed/unavailable upstream                                                            |  503 | `INQUIRY_SERVICE_UNAVAILABLE`                                    |
| Upstream timeout                                                                          |  504 | `INQUIRY_SERVICE_TIMEOUT`                                        |

The browser adapter must parse this union instead of collapsing every error. This table fixes the API/BFF mapping only;
which draft is retained, what retry action is shown, and how backoff is presented remain for
`Fehler-, Retry- und Recovery-Zustände`, not this research ticket.

### 8. Migration and cutover boundary

- Ship the change additively and backend-first. The Dashboard parser/provider may learn the two new capabilities before
  Website returns them; the feature remains unavailable while either capability or focused endpoint is absent. Website
  patient navigation remains hidden until its focused patient contract is available. There is no permanent dual write
  and no browser fallback to generic Payload APIs.
- New authenticated submissions cross the cutover only when Inquiry + patient binding + unique Conversation can commit
  atomically. Guest submissions continue to create Guest Inquiries without Conversations. Existing records are never
  claimed by email and receive no Conversation backfill.
- A deployment-time data inventory is a gate, not a product decision. If there are no persisted Inquiries, no business
  backfill is required; demo seeds can be regenerated. If records exist, map `submitted`, `in_review`, and `contacted`
  to the same handling value plus Open; map `spam` to Spam plus Closed. A legacy `closed` record has no recoverable prior
  handling state, so the safe default is Submitted plus Closed with an internal migration-audit marker rather than a
  false claim that contact occurred. Legacy Spam uses Submitted as its recorded prior status for a later remove-Spam
  operation, also with the migration marker.
- Contract fixtures in both repositories must describe the same DTOs, capabilities, codes, lifecycle transitions,
  participant isolation, and idempotency outcomes. The accepted architecture's synchronized-document rule remains the
  source of truth during the staggered deployment.

## Deliberately unresolved elsewhere

This resolution must not absorb adjacent tickets. Retention, redaction, exceptional deletion, moderation, and legal
hold behavior remain in the governance decision. Detailed loading/retry/recovery presentation remains in the blocked
error-state ticket. Transactional email delivery remains an external dependency. None changes the domain/API/BFF
contract above, except that the eventual governance result may add a redacted/deleted projection to already immutable
activity DTOs.

## Decision readiness

No further human product decision is required for this research ticket. The defaults above reconcile the accepted
Wayfinder decisions with the current repositories and leave only implementation planning and the explicitly separate
governance/error decisions for later.
