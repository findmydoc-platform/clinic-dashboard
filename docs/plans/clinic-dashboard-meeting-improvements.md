# Clinic Dashboard Meeting Improvements Plan

> **Planning record — 2026-07-17.** This document translates the approved clinic meeting follow-up into bounded, fixture-only implementation slices. It excludes the accent-color replacement, which is owned separately.

## User Outcome And Audience

Clinic staff can navigate a clearer dashboard prototype, understand reporting relationships, switch between fixture clinic locations, use safer fixture-backed profile and review workflows, and see future product areas without mistaking them for completed capabilities.

The primary audience is clinic staff reviewing the prototype. Product reviewers and implementation agents are secondary audiences. Platform staff continue to use Payload Admin; this plan does not create a platform-staff workflow.

## Scope And Pull-Request Boundaries

Each numbered slice is delivered through its own issue, branch, conventional commit history, and pull request. Pull requests are squash-merged in the dependency order below after their local validation and approved review gates pass.

| Slice                                           | User-visible outcome                                                                                                          | Bounded implementation                                                                                                                                                                                                                                                                 | Dependencies                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. Dashboard flow and layout                    | The reporting funnel reads as a process, and the lower dashboard uses its space intentionally.                                | Reduce the visual weight of funnel stage cards, make the arrows materially more prominent, remove excessive lower-grid stretching and whitespace, enlarge the chart area, and align its summary content.                                                                               | None.                                        |
| 2. Selectable KPI chart                         | A clinic user can select an eligible reporting KPI and see the chart and chart summary switch to the matching fixture metric. | Add keyboard-accessible selection for impressions, profile views, contacts, and inquiries, with one selected state, deterministic metric series, and equivalent pointer/focus information. Keep profile completion as a non-selectable summary because it has no time-series contract. | Slice 1.                                     |
| 3. Clinic location switcher                     | A clinic user can switch the visible workspace context between defined fixture locations.                                     | Add a fixture-backed selector that changes the location identity in the workspace header and dashboard location summary. Other feature snapshots remain explicitly organization-level and unchanged; selection resets on reload.                                                       | None.                                        |
| 4. Controlled treatments                        | Treatment editing reflects the platform-owned catalogue instead of accepting arbitrary treatment names.                       | Select treatments from a controlled fixture list, preserve price editing, remove the unconfirmed duration field, and provide a structured contact action when a treatment is missing.                                                                                                  | Slice 9 for the support handoff.             |
| 5. Read-only staff account                      | The account surface clearly represents the signed-in clinic staff member rather than the public clinic profile.               | Show a read-only fixture identity summary. Do not expose editing, email, phone, password, authentication, or two-factor controls.                                                                                                                                                      | None.                                        |
| 6. Moderated review responses                   | A clinic response is submitted for moderation instead of appearing to publish directly.                                       | Replace direct-publication semantics with a deterministic draft/submission/pending-moderation flow. Keep an existing published response visible while an edit is pending, and distinguish both states without reusing the appeal status.                                               | None.                                        |
| 7. Appeal case audit trail                      | Appeal references and state changes belong to an appeal case and can be followed over time.                                   | Remove appeal reference data from the review record, create it only when the fixture appeal case exists, and show a deterministic audit timeline for appeal events.                                                                                                                    | Slice 6.                                     |
| 8. Remove raw review export                     | The prototype no longer suggests that author-level review data can be downloaded.                                             | Remove the raw review CSV export and its author-data path. Do not invent or substitute a report. Preserve the separate aggregate profile-views export, which contains no review-author data.                                                                                           | Slice 7.                                     |
| 9. Structured support                           | The support surface offers one credible path without fabricated contact channels.                                             | Keep a structured support form and email-oriented submission wording. Remove phone, WhatsApp, example addresses, and other unsupported contact claims.                                                                                                                                 | None.                                        |
| 10. Subscriptions placeholder                   | Subscriptions is discoverable without implying that its product workflow is designed or complete.                             | Add a navigation item and an intentionally skeletal workspace with a heading, visible preview-state explanation, and neutral decorative blocks only. Add no plans, prices, controls, or business claims.                                                                               | Navigation contract only.                    |
| 11. Certificates and accreditations placeholder | Certificates and accreditations is discoverable without implying a completed workflow.                                        | Add a navigation item and the same intentionally skeletal workspace pattern, with no certificate model, upload controls, statuses, or accreditation claims.                                                                                                                            | Reuse the placeholder pattern from slice 10. |

## Access, Data, And Storage Decision

The existing temporary password guard remains the only access layer. The unauthenticated surface remains limited to `/login`, `/api/auth/login`, `/api/health`, and `/robots.txt`.

All new and changed states use deterministic, invented fixtures. Data classification is `none`: no real clinic, staff, patient, review-author, subscription, certificate, accreditation, or support data is introduced. Storage remains `none`; state is local to the rendered prototype and resets on reload. There is no Supabase, Payload, database, service-role credential, analytics query, new file export, or new API route in scope.

## Capability Matrix Check

The website capability matrix on `main` was re-checked on 2026-07-17. It already classifies treatment master selection under `website#1528`, separates approved public review responses from private moderation and appeals under `website#1529`, and keeps support, exports, clinic credential submission, and verification in later scope. The planned fixture corrections preserve those owners and classifications, so they do not require a companion website change.

Before slices 4 and 6–11 begin, re-check the current matrix and update the local prototype visibility plan with the changed control or fixture. If the backend owner, status, public visibility, cache impact, or capability classification has drifted, stop that slice and obtain explicit cross-repository scope before changing the website matrix.

## UI And Component Approach

- Follow `DESIGN.md`, the existing Atomic Design boundaries, shared primitives, and current Storybook conventions.
- Preserve the current app-shell and workspace-navigation model. New future-area entries use the existing navigation contract rather than adding public routes.
- Keep fixture contracts in the existing fixture or framework-light library layers. Reusable interactive components receive deterministic Storybook coverage.
- Treat light and dark mode as supported. Use light mode for default evidence and capture dark mode when a change affects contrast, status, overlay, or theme behavior.
- Keep placeholders deliberately non-specific: skeleton-like blocks communicate an unfinished preview, not loading from a real service. Visible copy must name the area and its unfinished state; decorative blocks stay hidden from assistive technology. Do not use `aria-busy`, progress, or live-region semantics because no asynchronous operation exists.
- Do not replace the dashboard accent color in any slice.

## Product Design Audit Lanes

Product Design is reserved for the two non-trivial visual flows:

1. **Dashboard lane:** capture and audit the current dashboard before slice 1, then perform the final Product Design audit after slice 2. The audit covers hierarchy, process clarity, selected-state affordance, keyboard/focus risks, responsive reflow, and light/dark legibility.
2. **Reviews lane:** capture and audit the current review-response and appeal flow before slice 6, then perform the final Product Design audit after slice 7. The audit covers moderation clarity, trust, appeal-case ownership, timeline comprehension, focus behavior, and status communication.

Each audit uses screenshots captured and inspected during that audit run in the in-app browser. Findings must point to the relevant step or screenshot and state evidence limits. Existing design-system patterns remain the source of truth. Product Design does not add a third UI reviewer to a slice; it replaces the regular UI reviewer at the final audit gate.

Slices 3–5 and 8–11 do not receive Product Design work because their visual decisions are bounded by existing controls and patterns.

## Test And Acceptance Plan

### Focused coverage

- Unit tests cover deterministic fixture transformations, selected reporting metric behavior, review moderation state, appeal-case references and events, removal of export capability, support-channel policy, and visibility/navigation contracts.
- Browser Storybook tests cover reusable interactive components, keyboard operation, focus visibility, accessible names, state announcements, and both theme states where affected.
- End-to-end smoke coverage verifies the eligible dashboard metric flow, location-context switching, controlled treatment editing, read-only account surface, moderated review response, appeal timeline, support flow, and both placeholder navigation entries without horizontal overflow at a 320 px viewport.
- No integration test is required because there is no persistent data behavior.

### Per-pull-request validation

Run the applicable focused tests plus the repository package gates:

1. `pnpm format:check`
2. `pnpm check`
3. `pnpm ai:slop-check`
4. `pnpm test:unit`
5. `pnpm test:storybook`
6. `pnpm build-storybook`
7. `pnpm build`
8. `pnpm test:e2e:smoke`
9. `pnpm deadcode:check`
10. `git diff --check`

The final exact `origin/main` revision additionally receives `pnpm deps:audit`, the repository-pinned Semgrep `1.159.0` scan, a light/dark visual pass, and a clean-worktree check.

## Reviewer Gates

Reviewers are read-only. Before each reviewer run, the coordinator recommends the named reviewers and obtains user confirmation. After a reviewer run, every finding is presented before any reviewer-driven fix is applied; fixes require separate user confirmation.

| Pull request      | Reviewers                                       |
| ----------------- | ----------------------------------------------- |
| Planning document | `planning_reviewer`, `test_reviewer`            |
| Slice 1           | `ui_reviewer`, `test_reviewer`                  |
| Slice 2           | Product Design final audit, `test_reviewer`     |
| Slices 3–4        | `ui_reviewer`, `test_reviewer`                  |
| Slices 5–6        | `ui_reviewer`, `security_reviewer`              |
| Slice 7           | Product Design final audit, `security_reviewer` |
| Slice 8           | `security_reviewer`, `test_reviewer`            |
| Slices 9–11       | `ui_reviewer`, `test_reviewer`                  |

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

- **Fixture behavior mistaken for production capability:** retain explicit preview wording, deterministic fixtures, no network path, and no persistence.
- **Visual slices drift while developed in parallel:** serialize dependent dashboard and review slices, keep one owner per pull request, and rebase independent work onto the latest merged `origin/main`.
- **Moderation or appeal semantics become misleading:** distinguish draft, pending moderation, published, and appeal-case states in fixtures and tests; do not imply that the clinic can publish directly.
- **Placeholder screens imply product commitments:** restrict them to neutral skeletons and accessible unfinished-state copy.
- **Raw personal data reappears through export:** test the capability contract and UI for the absence of review-author export.

Rollback is one squash-merge revert per slice. Because there is no persistence, migration, external side effect, or deployment, slices can be reverted independently in reverse dependency order.

## Explicitly Out Of Scope

- The accent-color replacement, including teal token or theme work.
- Real clinic, staff, patient, review, subscription, certificate, accreditation, or support data.
- Supabase authentication, two-factor authentication, Payload integration, API or database work, analytics, storage, email delivery, moderation services, file uploads, and report generation.
- A designed subscription workflow, pricing model, certificate workflow, accreditation model, or completion claims for either placeholder.
- Public route changes, production release, preview deployment, production deployment, domain verification, or release communication.
