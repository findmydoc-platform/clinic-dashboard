---
name: review-gate
description: Route a completed delivery diff to the smallest risk-based set of read-only project reviewers, obtain explicit approval, and consolidate their findings. Use before handoff or merge when repository changes need the Clinic Dashboard reviewer gate.
---

# Review Gate

Use the deterministic router and the project reviewer definitions. Do not substitute `/review` or `codex review` as an automatic second pass.

## Workflow

1. Complete relevant local validation. Run `pnpm review:route --base origin/main --format json`. Use its JSON only for the current decision; do not persist it as a repository or review artifact.
2. Read `references/routing.md`. Tell the user the exact recommended reviewer set and every omission with the route reasons.
3. Ask for one confirmation covering the proposed run. The routed reviewers' `sandbox_mode = "read-only"` configuration is the technical write boundary; do not ask the user to change the parent task permission. The coordinator performs no repository or external writes while the approved reviewer run is active.
4. Run `planning_reviewer` separately before risky implementation when routed. After implementation, run only the routed implementation reviewers, with at most four concurrent roles. If five implementation reviewers are routed, use a second read-only wave under the same approval.
5. Give each reviewer the scoped diff, relevant repository rules, route reasons, and existing validation results. Reviewers inherit green checks and do not rerun full suites.
6. Treat any failed or incomplete reviewer as a blocked gate until retry or an explicit documented exception.
7. Merge findings with the same root cause in the user-facing response. Keep a separate test gap only when its impact or minimal remedy differs from the product defect.
8. Present every finding before fixes. Severity 7-10 blocks handoff and merge; 4-6 requires an explicit fix or deferral decision; 1-3 remains visible and advisory.
9. After explicit fix approval, validate fixes deterministically. Do not routinely rerun reviewers. A material scope expansion starts a new approved review cycle.
10. Record only the compact gate status and decisions in the pull request. Do not persist route output, reviewer transcripts, or normalized finding files.

Run `pnpm review:verify` to validate the repository-side reviewer contracts.

## Repository audits

A repository audit requires an explicit user request. Select one method reviewer per audit: `test_reviewer`, `architecture_reviewer`, or `ui_reviewer`. Define the repository paths and evidence in scope, require the reviewer to state coverage and exclusions, and keep the normal approval and finding-handling rules. Do not turn repository audits into the default delivery gate.
