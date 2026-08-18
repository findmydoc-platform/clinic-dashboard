# Clinic Dashboard Reviewer System

## Outcome

The repository uses a small approval-gated reviewer workflow. A deterministic path router recommends the relevant read-only reviewers. The coordinator obtains one user confirmation, runs only those reviewers, consolidates duplicate findings, and presents every finding before any reviewer-driven fix.

AI reviewers do not run in CI. CI checks only the small repository contract for reviewer names, models, read-only mode, routing, and package entry points.

## Workflow

1. Complete relevant local validation.
2. Run `pnpm review:route --base origin/main --format json`.
3. State every recommended and omitted reviewer with the route reason.
4. Obtain one explicit approval for the consolidated run.
5. Run `planning_reviewer` separately when planning or access decisions changed. Run the routed implementation reviewers in parallel.
6. Merge findings with the same root cause and present all findings before fixes.
7. Apply reviewer-driven fixes only after explicit approval and validate them deterministically without a routine reviewer rerun.

The route JSON is temporary current-task context. It is not committed or stored as a review artifact. The pull request records only the reviewed surface, reviewer set, result, and open, fixed, deferred, or excepted decisions.

`/review` and `codex review` remain manual ad-hoc paths and are not stacked automatically on this workflow.

## Reviewer ownership

| Reviewer            | Model           | Reasoning | Ownership                                                                           |
| ------------------- | --------------- | --------- | ----------------------------------------------------------------------------------- |
| `planning_reviewer` | `gpt-5.6-terra` | medium    | Goal, scope, access, data, rollout, and exclusions                                  |
| `logic_reviewer`    | `gpt-5.6-sol`   | high      | Domain correctness, state, mapping, async behavior, errors, and API behavior        |
| `security_reviewer` | `gpt-5.6-sol`   | high      | Auth, tenant isolation, trust boundaries, secrets, privacy, and abuse               |
| `test_reviewer`     | `gpt-5.6-terra` | high      | Test layers, meaningful coverage, deterministic mocks, gaps, and false confidence   |
| `ui_reviewer`       | `gpt-5.6-terra` | high      | Responsive UI, accessibility, focus, themes, design-system use, and visual evidence |

Every reviewer uses `sandbox_mode = "read-only"`. The parent task permission does not need to change, but the coordinator performs no repository or external writes during the active reviewer run.

The security reviewer uses a conventional SaaS threat model. It remains strict for reachable authentication, authorization, tenant-isolation, privacy, and data-integrity risks, while treating the local checkout, developer workstation, approved CI runner, and authorized platform controls as trusted unless a change moves that boundary.

Every finding includes an owner, severity from 1 to 10, confidence, concrete evidence, impact, reproduction or logical proof, and a minimal recommendation. Style-only and metric-only comments are excluded.

## Routing

The router scans changes since the merge-base with `origin/main`, including branch commits, index and worktree changes, renames, deletions, and untracked non-ignored files.

- Plans, project-profile, access, data, migration, and rollout decisions route to `planning_reviewer`.
- Production TypeScript, server, controller, model, state, mapping, API, and executable tooling route to `logic_reviewer`.
- Auth, API, server, environment, workflow, dependency, persistence, secrets, Codex command rules, reviewer configuration, proxy gateways, Next.js or Vercel configuration, and `.env` contracts route to `security_reviewer`.
- Production behavior, tests, test configuration, fixtures, mocks, and Codex or reviewer contracts route to `test_reviewer`.
- TSX, styles, stories, themes, branding, and visual assets route to `ui_reviewer`.

The UI reviewer starts with existing Mobile, Light, Dark, and Storybook evidence. It uses a focused browser run only when evidence is missing, contradictory, or interaction-critical. Reviewers inherit relevant green validation and avoid full-suite reruns.

## Gate policy

- Severity 7-10 blocks handoff and merge.
- Severity 4-6 requires an explicit fix or deferral decision.
- Severity 1-3 remains visible and advisory.
- A failed or incomplete reviewer blocks the gate until retry or an explicitly documented exception.
- Findings are always shown before fixes.
- A material scope expansion starts a new approval-gated review cycle.

## Verification

- Routing tests cover empty, documentation-only, UI, logic, auth/API, workflow/dependency, cross-cutting, security-platform, rename/delete, untracked, and pnpm argument-forwarding cases.
- Contract tests pin agent names, models, reasoning, read-only mode, role output rules, project concurrency, skill metadata, and package entry points.
- `pnpm review:verify` runs inside `pnpm check`.
- CI never starts AI reviewers.

## Scope boundaries

Public product APIs, authentication behavior, data models, UI, deployment configuration, and production operations remain unchanged.

Out of scope:

- Persisted route manifests or review transcripts
- Manifest or finding schemas
- Diff digests and artifact verification
- Validation-evidence ingestion or secret scanning
- Automatic GitHub AI review
- AI reviewers in CI
- A general maintainability scoring system
