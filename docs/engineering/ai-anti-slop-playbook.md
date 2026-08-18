# AI Instruction Governance Playbook

This playbook defines the deterministic instruction checks used in the clinic dashboard repository.

## Objectives

- Keep the effective instruction graph discoverable.
- Keep instruction files within objective size and example budgets.
- Reject contradictory language or execution requirements in scopes that apply together.

## Design Principles

1. Repository and path-specific instructions remain in layered `AGENTS.md` files.
2. Objective structural checks are automated; tone and output style remain outside the checker.
3. Parent-child conflicts are evaluated along effective instruction chains, not across disjoint sibling scopes.
4. Short examples are allowed when they remove ambiguity.

## Enforcement Model

- Local pre-push: `pnpm ai:slop-check:prepush` checks changed instruction files and resolves conflicts against the complete effective instruction graph.
- The effective graph follows Codex precedence per directory: a non-empty `AGENTS.override.md` replaces `AGENTS.md`; otherwise `AGENTS.md` applies.
- PR Quality lane: `pnpm check` runs the complete `pnpm ai:slop-check`; any finding fails the workflow.
- Deep Quality lane: scheduled or manual runs repeat the complete checker alongside broader audits.
- Review: instruction changes should receive the read-only planning or security reviewer when relevant.

The checker is fail-closed inside each workflow. Repository rules decide whether the workflow itself is a required merge check; that branch-protection policy is outside this playbook.

## Checker Contract

- Command: `pnpm ai:slop-check`
- Strict mode exits non-zero on violations.
- Report mode emits findings but exits zero.
- Changed files can be supplied with `--changed-files` or `--changed-files-file`.
- Reports can be written with `--report-json <path>`.

## Budgets And Conflicts

- Scanned instruction files are limited to 180 lines, 24 hard rules, and one example block.
- Skill reference files may contain up to three example blocks.
- The checker detects conflicting user-communication languages and contradictory build requirements along effective parent-child `AGENTS.md` chains.
- Instruction discovery covers active root and nested `AGENTS.md` or override files, scoped playbooks, Codex agents, command rules, and skills.

The checker does not require a root style policy, fixed output headings, fixed uncertainty labels, filler-phrase bans, or model-specific wording.

## Exceptions

Use an exception only when a finding is confirmed noise and cannot be fixed immediately. Record an owner, rationale, expiration date, and issue or pull request reference.

## Review Checklist

1. Is each instruction scoped to the closest applicable file?
2. Is the rule set concise and non-redundant?
3. Are conflicts with other effective instruction layers absent?
4. Are examples short and necessary?
5. Does `pnpm ai:slop-check` pass locally?
