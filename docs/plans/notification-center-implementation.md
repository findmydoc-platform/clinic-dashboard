# Notification center implementation plan

Approved for implementation on 2026-10-14. This document records the implementation plan, not completed work or deployed capability.

## Current state and intended outcome

The Dashboard currently presents demo notification events and stores personal read IDs locally. Clinic staff need authorized event history and personal acknowledgements that survive sessions and devices, with exact destinations and the complete event catalog in [specification #200](https://github.com/findmydoc-platform/clinic-dashboard/issues/200).

The audience is authenticated clinic staff. Platform staff continue using Payload Admin. Notifications are private clinic business information, including patient-related references and currently permitted display details. All notification reads and mutations require authenticated, currently authorized access. No public route is added.

Website/Payload remains the source of truth for identity, clinic assignment, authorization, source transitions, canonical occurrences, and personal receipts. Dashboard gains no durable business storage, direct database access, service-role credentials, or scheduling authority. Store minimal event details; do not store patient-message bodies, file previews, or internal moderation reasons in notification envelopes. Use synthetic identities and content for tests and screenshots.

This plan follows the [shared platform architecture](https://github.com/findmydoc-platform/platform-architecture/blob/main/05_building_block_view.md), the local frontend architecture, the [notification contract resolution](https://github.com/findmydoc-platform/clinic-dashboard/issues/174#issuecomment-6108888489), the [recovery resolution](https://github.com/findmydoc-platform/clinic-dashboard/issues/175#issuecomment-6132726566), and the [activation resolution](https://github.com/findmydoc-platform/clinic-dashboard/issues/176#issuecomment-6146970536). The [retention refinement confirmed on 2026-10-14](https://github.com/findmydoc-platform/clinic-dashboard/issues/200#issuecomment-6156649147) governs cleanup timing.

## Contract-first implementation

Website owns `clinic-notifications-v1`. Within #202, define the complete closed event variants, errors, and response shapes and executable synthetic contract cases before implementing Dashboard adapters. Both applications validate equivalent cases. A shared runtime package is not required. Each later extension follows contract case, Website implementation, Dashboard integration, then cross-application acceptance. Parallel implementers must not evolve competing contracts.

- Website `GET /api/clinic-dashboard/notifications` and Dashboard `GET /api/notifications` provide the complete unread count with `mode=summary` and feed pages with `mode=page&view=unread|all`.
- Website and Dashboard expose corresponding `POST .../notifications/read` endpoints. Requests contain only the fixed `notificationIds` selection. The server determines clinic, reader, and read time.
- Responses declare the contract version and authoritative UTC `serverTime`. Count metadata includes `unreadCount` and nullable `nextUnreadCountChangeAt`; pages include the selected view, complete entries, and nullable `nextCursor`. Continuation pages omit a separately recalculated complete count.
- Pages contain at most 25 complete entries and 512 KiB of complete serialized JSON. Never split, truncate, or skip message groups. An individually oversized complete entry produces the specified size failure. Read requests have a 4 MiB body limit without an additional arbitrary numeric batch limit or separately successful chunks.
- Negotiate support additively while preserving existing bootstrap response shapes. Unknown variants, incompatible versions, and invalid responses fail explicitly.

### Website capture and history

Capture the seven approved event groups: new inquiry; patient message in an existing inquiry; review publication; clinic-response approval, rejection, or blocking; final review-appeal outcome; inquiry restriction/restoration and final inquiry-appeal outcome; review withdrawal/removal. A new inquiry and its initial text produce one occurrence. Ordinary edits, unpublished review saves, clinic-message sends, submissions, intermediate processing, and attachment upload do not independently produce events.

- Store each qualifying source transition and its occurrence in the same successful transaction. Rollback removes both. Source retries are bounded to three total attempts within the source request budget and preserve idempotence.
- Preserve immutable occurrence identity, source references, `occurredAt`, and `expiresAt`. Enforce canonical event uniqueness and occurrence/reader receipt uniqueness. Cover every executable qualifying write path, including Admin, REST, and Local API review workflows.
- Recheck current authorization and expiry before count, grouping, sorting, and pagination. Personally unread patient messages for an inquiry form a complete group. In All, read messages appear individually. Other events remain individual entries.
- Use deterministic live cursor pagination and deduplication. The accepted omission of an unloaded group that moves ahead of the cursor lasts until refresh. Do not add stored snapshots or a total loaded-list limit.
- At acknowledgement commit, recheck access, authorization, and expiry. Atomically acknowledge all remaining eligible unread members or none. Preserve the first `readAt`; skip ineligible members without protected details.
- Add ordinary authorized review detail reads by exact ID in #204. Notification visibility and target availability remain separate. An unavailable target may leave an independently authorized notification with only permitted details.

### Dashboard behavior and design

Use selected candidate 1, pinned at commit `d6b8e8b1dd197576a4470d31899577fde81747ad`. [The original reference image](https://github.com/findmydoc-platform/clinic-dashboard/blob/d6b8e8b1dd197576a4470d31899577fde81747ad/docs/plans/assets/clinic-notification-center/notification-feed-selected.png) is the design baseline. #201 supplies the missing state and mobile references. Images guide implementation; interaction and accessibility require browser evidence.

- Introduce the `notifications` business area with its public entry, controller, view models, validation, browser commands, refresh lifecycle, and private server provider. Compose Controlled and Payload providers centrally. Extend architecture checks, Storybook governance, and documentation.
- Remove demo notification events and session-stored acknowledgement from normal operation. Provider failures never select demo data. Preserve authenticated sessions, mutation guards, exact-origin checks, CSRF, private/no-store responses, and sanitized errors.
- Workspace owns cross-feature navigation and unsaved-work protection. Inquiry and review features own exact opening commands and completion results. Each opening request has a unique identity; only an actually displayed exact detail confirms successful opening.
- Fix occurrence selections at action start. Bulk marking includes only displayed unread entries and shows their entry count. Later arrivals, refresh, and unloaded entries cannot widen a selection.
- Confirm unsaved-work protection before navigation. Cancellation or failed opening creates no receipt. After successful display, separately acknowledge the original selection. Use optional exact anchors only when already present in the ordinary authorized detail response.
- Poll every 30 seconds while the authenticated tab is visible and online. Refresh counts with the center closed; with the center open, reload from the beginning through the previously loaded extent and replace state only after complete success. Invalidate obsolete responses and preserve view and scroll position.
- Apply the eight-second complete-refresh budget, transient retry intervals of 5, 10, and 20 seconds followed by 30 seconds, and `Retry-After` for automatic and manual triggers. Authorization rejection and incompatibility do not start automatic retry loops.
- Distinguish confirmed acknowledgement, definite non-commit, unknown write outcome, and failed refresh after confirmed success. Do not automatically retry acknowledgements. Empty states require validated authorized responses; a failed count cannot become zero.
- Remove loaded members at their exact expiry and reconcile complete count metadata. Logout, principal/clinic changes, and detected access loss clear or hide scoped data and invalidate old actions. Transient failures may retain permitted unexpired state visibly stale.

Use English UI copy, WCAG 2.2 AA, the WAI-ARIA Modal Dialog Pattern where applicable, Mobile First, and Responsive Web Design. Provide rendered screenshots of changed UI states in chat.

## Independent retention and diagnostics

Logical expiry is exact: `expiresAt = occurredAt + 90 days`. From that instant, each occurrence is invisible, uncounted, and ineligible for new receipts, even if cleanup fails. Reads, grouping, retries, redelivery, schema conversion, and staff reassignment never extend expiry or recreate expired history.

Website owns an independent cleanup cronjob scheduled every five minutes. Physically delete expired occurrences and their receipts in the next successful scheduled execution. Normal scheduling delay is allowed and is not a deadline violation. Record observed missed executions and deletion failures immediately, and retry idempotently with bounded attempts. Invisible rows are not evidence of physical deletion.

- Production uses a dedicated internal Website retention endpoint and cron. Preview uses a separate relay endpoint and cron in the existing Preview scheduler. Neither depends on successful email processing.
- Keep scheduling authority, runtime calls, credentials, state, and failure boundaries separate for Preview and Production. General execution infrastructure may be reused within those constraints.
- Delete bounded batches transactionally, safely across concurrent or repeated runs, without orphaned receipts or changes to source business records.
- Use existing structured Vercel logs and PostHog Error Tracking. Record controlled technical classifications, attempt counts, elapsed time, environment, technical correlation identifiers, contract/deployment metadata, and aggregate cleanup results. Exclude patient content, names, credentials, raw bodies, upstream responses, and business-record identifiers. Metric dimensions contain no personal, clinic, or occurrence identifiers.
- Before activation, verify actual diagnostic retention, access, and environment separation. Existing diagnostics and manual technical triage suffice; no new diagnostic store or operator-alert infrastructure is required.

## Native ticket graph and delegated work

GitHub's native blocking relationships are authoritative. The approved graph is:

| Ticket                                                                    | Deliverable                                                                   | Blocked by             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| [#201](https://github.com/findmydoc-platform/clinic-dashboard/issues/201) | Missing state and mobile design references                                    | None                   |
| [#202](https://github.com/findmydoc-platform/clinic-dashboard/issues/202) | Real new inquiry, persistence, complete contracts, provider/BFF, initial feed | #201                   |
| [#212](https://github.com/findmydoc-platform/clinic-dashboard/issues/212) | Personal explicit marking                                                     | #202                   |
| [#213](https://github.com/findmydoc-platform/clinic-dashboard/issues/213) | Exact inquiry opening and acknowledgement after display                       | #212                   |
| [#203](https://github.com/findmydoc-platform/clinic-dashboard/issues/203) | Complete patient-message groups                                               | #213                   |
| [#204](https://github.com/findmydoc-platform/clinic-dashboard/issues/204) | Review publication, withdrawal/removal, exact review destination              | #213                   |
| [#206](https://github.com/findmydoc-platform/clinic-dashboard/issues/206) | Inquiry restrictions, restoration, final appeal decisions                     | #213                   |
| [#205](https://github.com/findmydoc-platform/clinic-dashboard/issues/205) | Clinic-response and review-appeal decisions                                   | #204                   |
| [#207](https://github.com/findmydoc-platform/clinic-dashboard/issues/207) | Cursor pagination and older history                                           | #203                   |
| [#214](https://github.com/findmydoc-platform/clinic-dashboard/issues/214) | Atomic marking of displayed unread entries                                    | #207                   |
| [#208](https://github.com/findmydoc-platform/clinic-dashboard/issues/208) | Refresh, expiry, and failure recovery                                         | #214                   |
| [#209](https://github.com/findmydoc-platform/clinic-dashboard/issues/209) | Physical cleanup through independent five-minute cron                         | #202                   |
| [#210](https://github.com/findmydoc-platform/clinic-dashboard/issues/210) | Preview qualification and authorized activation                               | #205, #206, #208, #209 |
| [#211](https://github.com/findmydoc-platform/clinic-dashboard/issues/211) | Separate Production qualification and authorized activation                   | #210                   |

After #202, #209 can run alongside #212 followed by #213. After #213, #203, #204, and #206 can proceed concurrently. Dispatch only tickets whose native blockers are satisfied.

Use `feature/200-notification-center` integration branches in both repositories, based on current `origin/main`. Preserve existing local changes. For every ready implementation ticket, assign an implementer subagent explicit ownership and its own branch and worktree from the relevant integration tip. Cross-repository tickets have paired branches. Implementers use Outside-In TDD for observable behavior, accommodate concurrent work, and merge the current integration tip before handoff. A merger subagent integrates completed work serially and validates shared boundaries.

After the first integrated commit, open linked draft PRs in both repositories with the same contract version and relevant tickets, using each repository's PR template. Close code tickets only when their complete cross-repository acceptance criteria pass. Keep #200, #210, and #211 open until the corresponding operational acceptance is complete. Remove temporary implementation worktrees after their work is safely integrated.

## Tests and acceptance

Use the three approved test boundaries. Existing governed BFF integration and executable contract tests supplement them.

1. **Cross-application acceptance:** Exercise real Website source commands and persistence, authorized notification contracts, Dashboard BFF, and rendered UI with synthetic identities/content. Prove every event group, exact navigation, personal receipts, current permissions, and source-to-display freshness within one minute under normal availability.
2. **Website integration with an isolated real database:** Prove transaction rollback, uniqueness, concurrent/replayed commands, immutable identity and timestamps, atomic fixed selections, current authorization, and activation races. Inspect persistent invariants and actual occurrence/receipt deletion without user traffic, including missed executions and failure recovery.
3. **Storybook browser behavior and workspace journeys:** Cover Unread/All, complete counts/groups, pagination, fixed selections, unsaved-work cancellation, exact opening, keyboard/focus, responsive layouts, themes, loading/empty/stale/access states, definite and unknown acknowledgement outcomes, and failed refresh after confirmed writes.

Contract cases cover byte boundaries, individually oversized groups, unknown closed variants, principal/clinic/view-bound cursors, accepted live-pagination omission, complete loaded-extent refresh, obsolete responses, later message arrivals, expiry during actions, and lost write responses. Retention tests separately assert exact logical expiry and physical deletion in the next successful five-minute scheduled execution. Do not treat expiry filtering as deletion evidence.

Run required formatting, checks, and relevant package-script tests after each integrated code change. Before handoff, build both applications and validate affected Storybook coverage. Local tests and screenshots are not dated Preview or Production acceptance evidence.

## Review, delivery, and activation gates

Implementation and implementer/merger subagents are authorized. Recommend INVEST review before implementation and the required risk-based reviewers after local validation. AI reviewers run only after explicit user confirmation, following the repository review gate. Present all findings before asking whether to fix them.

Capture remains inactive throughout preparation. Verify complete producer coverage, matching application versions, additive negotiation, and the agreed acceptance categories before environment activation. Qualify Preview first with its own dated results, retention, access boundaries, and actual diagnostics settings. Prepared source wiring does not establish Preview availability.

Prepare joint Production delivery through the current Ops `platform-release` workflow. Freeze both Main SHAs and obtain the required approval for the exact version, plan digest, and content digest. Production activation separately requires its own dated evidence and explicit user approval in chat. Release approval does not replace activation approval, and Preview results do not establish Production availability.

Implementation authorization does not authorize deployment, environment activation, Production test writes, or environment refresh/publishing. No historical import, demo-read migration, creation queue, periodic completeness audit, extra approval roles, or arbitrary waiting period is included. Atomic capture couples qualifying source writes to notification storage; missing producer coverage or later silent corruption can remain undetected until observed. Polling also accepts delayed detection of remote permission changes. These accepted limits must remain explicit in acceptance and capability documentation.
