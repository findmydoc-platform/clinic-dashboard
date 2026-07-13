# AI Anti-Slop Playbook

This playbook defines how instruction quality is governed in the clinic dashboard repository.

## Objectives

- Reduce low-signal AI output.
- Keep instructions concise, scoped, and conflict-free.
- Preserve delivery speed with deterministic checks.

## Design Principles

1. Priority over volume: keep correctness, task completion, and brevity explicit.
2. Minimal constraints: avoid prompt and instruction overload.
3. Conflict-free instruction graph across root and scoped files.
4. Short examples only when they remove ambiguity.
5. Scoped guidance through layered `AGENTS.md` files.

## Enforcement Model

- Local pre-push: `pnpm ai:slop-check:prepush` checks only changed instruction files.
- Deep lane: scheduled or manual `pnpm ai:slop-check` checks the complete instruction surface.
- PR lane: general quality gates remain blocking; the AI-slop checker is intentionally kept in the deep lane.
- Review: instruction changes should receive the read-only planning or security reviewer when relevant.

## Checker Contract

- Command: `pnpm ai:slop-check`
- Strict mode exits non-zero on violations.
- Report mode emits findings but exits zero.
- Changed files can be supplied with `--changed-files` or `--changed-files-file`.
- Reports can be written with `--report-json <path>`.

## Budgets And Conflicts

- The root policy section is limited to 120 lines and 8 hard rules.
- Scanned instruction files are limited to 180 lines, 24 hard rules, and one example block.
- Skill reference files may contain up to three example blocks.
- The checker detects filler phrases, contextual AI disclaimers, language conflicts, tone conflicts, and contradictory build rules.

## Exceptions

Use an exception only when a finding is confirmed noise and cannot be fixed immediately. Record an owner, rationale, expiration date, and issue or pull request reference.

## Review Checklist

1. Are priorities explicit and ordered?
2. Is the rule scoped to the closest applicable instruction file?
3. Is the rule set concise and non-redundant?
4. Are conflicts with other instruction layers absent?
5. Are examples short and necessary?
6. Does `pnpm ai:slop-check` pass locally?
