# Clinic Dashboard Meeting Improvements Plan

> **Planning record — 2026-07-17.** This document translates the approved clinic meeting follow-up into bounded, prototype-data-only implementation slices. It excludes the accent-color replacement, which is owned separately.

## User Outcome And Audience

Clinic staff can navigate a clearer dashboard prototype, understand reporting relationships, switch between invented prototype locations, use safer prototype-backed profile and review workflows, and see future product areas without mistaking them for completed capabilities.

The primary audience is clinic staff reviewing the prototype. Product reviewers and implementation agents are secondary audiences. Platform staff continue to use Payload Admin; this plan does not create a platform-staff workflow.

## Scope And Pull-Request Boundaries

Each numbered slice is delivered through its own issue, branch, conventional commit history, and pull request. Pull requests are squash-merged in the dependency order below after their local validation and approved review gates pass.

| Slice                                           | User-visible outcome                                                                                                            | Bounded implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Dependencies                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. Dashboard flow and layout                    | The reporting funnel reads as a process, and the lower dashboard uses its space intentionally.                                  | At `xl`, cap each of the five funnel stage panels at `10rem`, keep at least `3rem` between them, and render `2rem` connector arrows in those gaps. Stack stages below `xl`. Set the lower desktop grid to top alignment, make the chart column at least twice either side column, and keep the chart summary directly below the chart without stretched empty card space.                                                                                                                                                                            | None.                                        |
| 2. Selectable KPI chart                         | A clinic user can select an eligible reporting KPI and see the chart and chart summary switch to the matching prototype metric. | Make `views` the default. Expose `impressions`, `views`, `contacts`, and `inquiries` as real button controls with `aria-pressed`; keep `completion` non-interactive. Preserve the selected metric across 7/30/90-day changes. Every period owns explicit prototype series for all four metrics, and each series must total its matching KPI. Derive the title, comparison, description, tooltip labels, and selected summary emphasis from one metric dictionary. Show the existing CSV action only for `views`.                                     | Slice 1.                                     |
| 3. Clinic location switcher                     | A reviewer can demonstrate a multi-location workspace without implying a tenant-selection contract.                             | Add `locationSwitching` as a typed prototype capability. In `visual-reference`, show a selector with default `berlin-mitte` (`Berlin Health Clinic — Mitte`, `Mitte, Berlin`) and alternate `berlin-charlottenburg` (`Berlin Health Clinic — Charlottenburg`, `Charlottenburg, Berlin`). Change only the workspace identity and dashboard location summary; all other data remains organization-level. In `presentation`, hide the selector and show the default identity. Never emit a clinic ID or persist selection; reload restores the default. | None.                                        |
| 4. Controlled treatments                        | Treatment editing reflects the platform-owned catalogue instead of accepting arbitrary treatment names.                         | Represent runtime catalogue entries in prototype data and selected clinic treatments as master-ID plus price relationships. Use the three existing treatments plus one available invented catalogue entry. New selection chooses an unused master entry; editing changes price only; duplicates are rejected; remove/undo remains. Remove duration from the model, UI, commands, and test data. In `visual-reference`, “Treatment missing?” opens slice 9; hide that handoff in `presentation`.                                                      | Slice 9 for the support handoff.             |
| 5. Read-only staff account                      | The account surface clearly represents the signed-in clinic staff member rather than the public clinic profile.                 | Add an `Account profile` menu action that opens a read-only dialog titled `Signed-in staff member`. Show only the existing invented avatar/initials, name, and role, plus a close action. Do not expose editing, email, phone, password, authentication, or two-factor controls. Keep theme and sign-out as separate account-menu actions.                                                                                                                                                                                                           | None.                                        |
| 6. Moderated review responses                   | A clinic response is submitted for moderation instead of appearing to publish directly.                                         | Keep dialog text as a local draft until submit. A valid submit creates a separate `pending-moderation` response and never changes it into a published response. When no published response exists, the card shows only the pending state; when editing a published response, keep the published text visible and show the pending edit separately. Do not set the review to `Answered` until a published response exists, and never reuse appeal status for response moderation.                                                                     | None.                                        |
| 7. Appeal case audit trail                      | Appeal references and state changes belong to an appeal case and can be followed over time.                                     | Replace the free review notice with an optional typed appeal case containing a deterministic reference, status, reason, and ISO timestamped events. Creation appends `appeal-submitted`; prototype status changes append `appeal-status-changed`. Render events oldest to newest in a semantic ordered list, with `No appeal case has been opened` when absent. Keep the reference and reason inside management history only, never on the general review card or in `presentation`.                                                                 | Slice 6.                                     |
| 8. Remove raw review export                     | The prototype no longer suggests that author-level review data can be downloaded.                                               | Remove the review export button, controller action, view-model command, CSV serializer, browser adapter, export-only feedback state, stories, tests, capability wording, and architecture references. Do not invent or substitute a report. Preserve the separate aggregate profile-views export, which contains no review-author data.                                                                                                                                                                                                              | Slice 7.                                     |
| 9. Structured support                           | The support prototype provides an honest structured form without claiming that a request was delivered.                         | Keep local field validation and an `Email` reply-method label, but remove phone, WhatsApp, addresses, service hours, direct-support claims, generated ticket references, SLAs, and response promises. Submit changes only local prototype state and must show `Prototype only — no request was sent.` Keep support hidden in `presentation`; it remains available in `visual-reference` for the treatment handoff.                                                                                                                                   | None.                                        |
| 10. Subscriptions placeholder                   | Subscriptions is discoverable without implying that its product workflow is designed or complete.                               | Add a typed `subscriptionsPlaceholder` capability. In `visual-reference`, show the navigation item and an intentionally skeletal workspace with a heading, visible preview-state explanation, and decorative blocks only. In `presentation`, remove the item and workspace from navigation. Add no route, deep link, plans, prices, controls, or business claims.                                                                                                                                                                                    | Navigation contract only.                    |
| 11. Certificates and accreditations placeholder | Certificates and accreditations is discoverable without implying a completed workflow.                                          | Add a typed `certificatesAccreditationsPlaceholder` capability and reuse the slice 10 workspace pattern. In `visual-reference`, expose the item and skeletal workspace; in `presentation`, remove both. Add no route, deep link, certificate model, upload control, status, or accreditation claim. Ensure the long navigation label wraps without clipping at 320 px.                                                                                                                                                                               | Reuse the placeholder pattern from slice 10. |

## Access, Data, And Storage Decision

The existing temporary password guard remains the only access layer. The unauthenticated surface remains limited to `/login`, `/api/auth/login`, `/api/health`, and `/robots.txt`.

Runtime state uses deterministic invented prototype data owned by `*.prototype-data.ts` files. Independent Storybook and unit-test examples use `*.fixtures.ts`; production code must never import those test fixtures. Data classification is `none`: no real clinic, staff, patient, review-author, subscription, certificate, accreditation, or support data is introduced. Storage remains `none`; state is local to the rendered prototype and resets on reload. There is no Supabase, Payload, database, service-role credential, analytics query, new file export, or new API route in scope.

## Capability Matrix Check

The website capability matrix on `main` was re-checked on 2026-07-17. It already classifies treatment master selection under `website#1528`, separates approved public review responses from private moderation and appeals under `website#1529`, and keeps support, exports, clinic credential submission, and verification in later scope. The planned prototype corrections preserve those owners and classifications, so they are not expected to create new website product scope.

Every slice 1–11 must complete the paired-record check in the same work item:

1. Re-check the current Website Capability Matrix before implementation begins.
2. Update the local prototype visibility plan for every changed screen, control, fixture, or gate.
3. Update the matching Website Capability Matrix row when one exists. If a purely visual change has no matching capability row, record that explicit no-contract result in the slice pull request instead of silently omitting the check.

If the backend owner, status, public visibility, cache impact, or capability classification has drifted, stop that slice and obtain explicit cross-repository scope before changing the website matrix. The initial matrix review above does not waive these per-slice synchronization requirements.

## UI And Component Approach

- Follow `DESIGN.md`, the existing Atomic Design boundaries, shared primitives, and current Storybook conventions.
- Preserve the current app-shell and workspace-navigation model. New future-area entries use the existing navigation contract rather than adding public routes.
- Keep runtime prototype-data contracts inside the owning feature and framework-light model layers. Keep independent fixtures inside testing layers. Reusable interactive components receive deterministic Storybook coverage.
- Treat light and dark mode as supported. Use light mode for default evidence and capture dark mode when a change affects contrast, status, overlay, or theme behavior.
- Keep placeholders deliberately non-specific: skeleton-like blocks communicate an unfinished preview, not loading from a real service. Visible copy must name the area and its unfinished state; decorative blocks stay hidden from assistive technology. Do not use `aria-busy`, progress, or live-region semantics because no asynchronous operation exists.
- Treat `visual-reference` as the complete prototype inventory. `presentation` hides location switching, support, Subscriptions, and Certificates and accreditations because no approved backend contract owns them.
- Do not replace the dashboard accent color in any slice.

## Product Design Audit Lanes

Product Design is reserved for the two non-trivial visual flows:

1. **Dashboard lane:** capture and audit the current dashboard before slice 1, then perform the final Product Design audit after slice 2. The audit covers hierarchy, process clarity, selected-state affordance, keyboard/focus risks, responsive reflow, and light/dark legibility.
2. **Reviews lane:** capture and audit the current review-response and appeal flow before slice 6, then perform the final Product Design audit after slice 7. The audit covers moderation clarity, trust, appeal-case ownership, timeline comprehension, focus behavior, and status communication.

Each audit uses screenshots captured and inspected during that audit run in the in-app browser. Findings must point to the relevant step or screenshot and state evidence limits. Existing design-system patterns remain the source of truth. Product Design does not add a third UI reviewer to a slice; it replaces the regular UI reviewer at the final audit gate.

Slices 3–5 and 8–11 do not receive Product Design work because their visual decisions are bounded by existing controls and patterns.

## Test And Acceptance Plan

### Focused coverage

- Unit tests cover deterministic prototype-data mapping, selected reporting metric behavior, review moderation state, appeal-case references and events, removal of export capability, support-channel policy, and visibility/navigation contracts.
- Browser Storybook tests own isolated component interaction, dialogs, keyboard and focus behavior, accessible names, state communication, responsive 320 px layouts, and theme variants. Slices 2, 5, 6, 7, 9, 10, and 11 add explicit dark stories with `globals: { theme: "dark" }`.
- New end-to-end assertions are limited to two cross-feature shell contracts: location selection followed by reload restores the default, and the missing-treatment action opens the honest support prototype. The existing authentication, navigation, sign-out, and theme smoke coverage remains.
- No integration test is required because there is no persistent data behavior.

### Slice acceptance matrix

| Slice | Given / when / then contract                                                                                                                                                                                                                                                                     | Unit evidence                                                                                                           | Storybook evidence                                                                                                | New E2E evidence                                                                          | Visual evidence                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1     | Given a 1440 px dashboard, when the funnel and lower grid render, then stage panels, gaps, arrows, chart ratio, and top alignment match the exact dimensions in the scope table; at 320 px they stack without horizontal overflow.                                                               | None; layout has no business policy.                                                                                    | Direct funnel and dashboard stories at 1440 px and 320 px.                                                        | None.                                                                                     | Light desktop and mobile screenshots; dashboard Product Design baseline comparison. |
| 2     | Given any reporting period, when an eligible KPI is activated by pointer, Enter, or Space, then `aria-pressed`, title, comparison, description, chart, tooltip labels, summary emphasis, and export visibility all reflect that metric. Period changes retain the selection.                     | Eligible IDs, `views` default, series-to-total invariant, selection retention, and views-only export.                   | Integrated selection, keyboard/focus, all periods, non-interactive completion, and explicit dark variant.         | None.                                                                                     | Light and dark screenshots; final dashboard Product Design audit.                   |
| 3     | Given `visual-reference`, when the alternate location is selected, then only the header identity and dashboard location summary change; reload restores `berlin-mitte`. Given `presentation`, the selector is absent.                                                                            | Location IDs/default, selection reducer, and capability behavior.                                                       | Selector keyboard behavior, both identities, both modes, and 320 px layout.                                       | Select alternate location, assert both changed surfaces, reload, assert default restored. | Light screenshot; security review confirms no tenant or clinic-ID semantics.        |
| 4     | Given an unused catalogue entry, when it is selected, then the clinic relationship uses its master ID and a price. Existing entries permit price edits only, duplicates fail, duration is absent, and the missing-treatment action opens support only in `visual-reference`.                     | Catalogue/relationship mapping, duplicate rejection, price update, remove/undo, and absence of duration.                | Add/edit/remove flows, focus return, presentation gating, and support handoff.                                    | Missing treatment opens the support prototype and no request is sent.                     | Light dialog screenshot.                                                            |
| 5     | Given the account menu, when `Account profile` is activated, then `Signed-in staff member` opens with avatar/initials, name, role, and close only; prohibited contact/auth/edit controls are absent.                                                                                             | Account action visibility and read-only field contract.                                                                 | Menu keyboard order, dialog focus/close return, negative control assertions, and explicit dark variant.           | None; existing sign-out E2E remains.                                                      | Light and dark dialog screenshots.                                                  |
| 6     | Given a review with or without a published response, when valid draft text is submitted, then a separate pending response appears; published text remains unchanged, and review/appeal statuses do not impersonate moderation.                                                                   | Draft-to-pending transition, published preservation, status invariants, empty validation, and deterministic timestamps. | New response, edited response, focus return, pending label, retry/withdrawal behavior, and explicit dark variant. | None.                                                                                     | Light and dark screenshots.                                                         |
| 7     | Given no appeal case, history shows the explicit empty state. When an appeal is submitted, then one case reference and `appeal-submitted` event exist; later status change appends one event, and the ordered timeline remains oldest first and management-only.                                 | Reference ownership, unique event IDs, ISO timestamps, chronological order, and no case data on the review card.        | Empty, submitted, status-changed, focus behavior, presentation hiding, and explicit dark variant.                 | None.                                                                                     | Light and dark screenshots; final reviews Product Design audit.                     |
| 8     | Given review management, when it renders after this slice, then no raw-export control, command, serializer, adapter, feedback message, or capability claim exists; aggregate profile-view export still works.                                                                                    | Review-export capability absence and preserved aggregate-export contract.                                               | Management story asserts no review export in both interface modes.                                                | None.                                                                                     | Light reviews screenshot.                                                           |
| 9     | Given `visual-reference`, when required fields are invalid, then local validation blocks submit. When valid fields submit, then the only result is `Prototype only — no request was sent.` No ticket, channel link, SLA, or reply promise appears. Given `presentation`, support remains hidden. | Allowed fields, email label, prohibited channels/claims, local result state, and no ticket generation.                  | Validation, honest result, focus behavior, presentation hiding, and explicit dark variant.                        | Covered only by slice 4 cross-feature handoff.                                            | Light and dark screenshots.                                                         |
| 10    | Given `visual-reference`, when Subscriptions is selected, then the heading, preview explanation, and decorative `aria-hidden` blocks render with no action. Given `presentation`, the navigation item and workspace are absent.                                                                  | Navigation uniqueness/order and capability gate.                                                                        | Both modes, callback/current state, no actions, 320 px, accessibility, and explicit dark variant.                 | None.                                                                                     | Light and dark screenshots.                                                         |
| 11    | Given `visual-reference`, when Certificates and accreditations is selected, then the reused placeholder pattern renders and the long label wraps without clipping. Given `presentation`, the item and workspace are absent.                                                                      | Navigation uniqueness/order and capability gate.                                                                        | Both modes, no actions, 320 px label/layout, accessibility, and explicit dark variant.                            | None.                                                                                     | Light and dark screenshots.                                                         |

### Per-pull-request validation

Run the applicable focused tests plus the repository package gates:

1. `pnpm format:check`
2. `pnpm check`
3. `pnpm ai:slop-check`
4. `pnpm test:unit`
5. `pnpm test:storybook`
6. `pnpm build-storybook`
7. `pnpm build`
8. `CI=1 pnpm test:e2e:smoke`
9. `pnpm deadcode:check`
10. `git diff --check`

`pnpm check` already invokes `pnpm ai:slop-check` and `pnpm deadcode:check`. Steps 3 and 9 intentionally run them again so each pull request records those two policy results explicitly.

### E2E isolation

The coordinator is the only owner of E2E execution. E2E gates are serialized across all implementation worktrees; no two lanes may bind port `3100` concurrently. `CI=1` makes `reuseExistingServer` false, so a run fails instead of silently testing another worktree's server. Before each run, the coordinator checks `lsof -nP -iTCP:3100 -sTCP:LISTEN`; an occupied port is investigated and only a verified Clinic Dashboard test server may be stopped.

### Final exact-main gate

After all squash merges, the coordinator runs the following on a clean checkout of `origin/main`:

```bash
git fetch origin main
git switch --detach origin/main
git rev-parse HEAD
git rev-parse origin/main
git status --short
pnpm format:check
pnpm check
pnpm ai:slop-check
pnpm test:unit
pnpm test:storybook
pnpm build-storybook
pnpm build
CI=1 pnpm test:e2e:smoke
pnpm deadcode:check
pnpm deps:audit
python -m pip install semgrep==1.159.0
semgrep scan --config p/ci --error
git diff --check
git status --short
```

The two revisions must be identical, both `git status --short` calls must be empty, every command must exit zero, and the light/dark visual pass must cover every changed screen. No deployment command follows this gate.

## Reviewer Gates

Reviewers are read-only. Before each reviewer run, the coordinator recommends the named reviewers and obtains user confirmation. After a reviewer run, every finding is presented before any reviewer-driven fix is applied; fixes require separate user confirmation.

| Pull request      | Reviewers                                                        |
| ----------------- | ---------------------------------------------------------------- |
| Planning document | `planning_reviewer`, `test_reviewer`                             |
| Slice 1           | `ui_reviewer`, `test_reviewer`                                   |
| Slice 2           | Product Design final audit, `test_reviewer`                      |
| Slice 3           | `ui_reviewer`, `security_reviewer`, `test_reviewer`              |
| Slice 4           | `ui_reviewer`, `test_reviewer`                                   |
| Slice 5           | `ui_reviewer`, `security_reviewer`                               |
| Slice 6           | `ui_reviewer`, `security_reviewer`, `test_reviewer`              |
| Slice 7           | Product Design final audit, `security_reviewer`, `test_reviewer` |
| Slice 8           | `security_reviewer`, `test_reviewer`                             |
| Slices 9–11       | `ui_reviewer`, `test_reviewer`                                   |

Severity 7–10 findings block merge. Lower-severity findings still remain visible for an explicit fix or defer decision.

## Delivery Order And Agent Allocation

The coordinator owns sequencing, issue and pull-request hygiene, validation evidence, reviewer gates, squash merges, and final `origin/main` verification. Two implementation agents may work concurrently in isolated worktrees, with one slice and one branch owned by each agent. Review agents receive read-only scope and do not modify implementation branches.

The preferred eight-slot topology is one coordinator, two implementation agents, up to four reviewers, and one buffer slot. When fewer slots are available, preserve two implementation lanes and run reviewer pairs sequentially.

| Wave    | Lane A                               | Lane B                        | Additional gate                                    |
| ------- | ------------------------------------ | ----------------------------- | -------------------------------------------------- |
| 0       | Planning pull request                | —                             | Planning and test review                           |
| Audit A | Dashboard baseline capture and audit | —                             | Product Design evidence before implementation      |
| 1       | Slice 1                              | Slice 9                       | Standard reviewers                                 |
| 2       | Slice 2                              | Slice 3                       | Dashboard Product Design final audit after slice 2 |
| Audit B | Reviews baseline capture and audit   | —                             | Product Design evidence before implementation      |
| 3       | Slice 6                              | Slice 4                       | Standard reviewers                                 |
| 4       | Slice 7                              | Slice 5                       | Reviews Product Design final audit after slice 7   |
| 5       | Slice 8                              | Slice 10                      | Standard reviewers                                 |
| 6       | Slice 11                             | Final integration preparation | Standard reviewers                                 |

Each pull request links its own issue using `Closes #...`, includes access/data classification and local validation evidence, and is squash-merged only after required review decisions are resolved. Later branches start from the latest merged `origin/main` unless an explicit dependency requires a temporary stack.

## GitHub Checks, Completion, And Deployment Boundary

GitHub Actions are advisory while account billing blocks execution. A pull request may merge only when the exact check annotation is verified as a billing or account-infrastructure failure and every applicable local package gate is green. Any real code, format, test, build, security, or review failure blocks merge.

The work is complete only when the planning pull request and all eleven implementation pull requests are tested, reviewed, squash-merged, and the exact final `origin/main` revision passes the final validation suite. A clean local branch or an open pull request is not completion.

No deployment is authorized. Do not invoke Vercel, dispatch deployment workflows, verify preview or production domains, or create a release. Deployment begins only after a later explicit user command.

## Risks And Rollback

- **Prototype behavior mistaken for production capability:** retain explicit preview wording, deterministic invented prototype data, independent test fixtures, no network path, and no persistence.
- **Visual slices drift while developed in parallel:** serialize dependent dashboard and review slices, keep one owner per pull request, and rebase independent work onto the latest merged `origin/main`.
- **Moderation or appeal semantics become misleading:** distinguish draft, pending moderation, published, and appeal-case states in prototype data and independent test fixtures; do not imply that the clinic can publish directly.
- **Placeholder screens imply product commitments:** restrict them to neutral skeletons and accessible unfinished-state copy.
- **Raw personal data reappears through export:** test the capability contract and UI for the absence of review-author export.

Rollback is one squash-merge revert per slice. Because there is no persistence, migration, external side effect, or deployment, slices can be reverted independently in reverse dependency order.

## Explicitly Out Of Scope

- The accent-color replacement, including teal token or theme work.
- Real clinic, staff, patient, review, subscription, certificate, accreditation, or support data.
- Supabase authentication, two-factor authentication, Payload integration, API or database work, analytics, storage, email delivery, moderation services, file uploads, and report generation.
- A designed subscription workflow, pricing model, certificate workflow, accreditation model, or completion claims for either placeholder.
- Public route changes, production release, preview deployment, production deployment, domain verification, or release communication.
