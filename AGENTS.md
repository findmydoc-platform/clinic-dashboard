# findmydoc Clinic Dashboard

## Project Profile

Read `.codex/project-profile.toml` before implementation work. Bootstrap decisions are complete.

The current application uses server-side Supabase sessions and the authorized Payload bootstrap for clinic identity. Dashboard business content remains fixture-backed demo data. Payload is the source of truth for identity and authorization; do not add direct database access or service-role credentials to this application.

## Fixed Standards

- Use Next.js, React, TypeScript, Node 24, pnpm 10, Tailwind 4, Atomic Design, shadcn/ui, Storybook, Vitest, and Playwright.
- Keep the unauthenticated surface limited to the routes registered in `src/lib/security/public-routes.ts`; update the registry, project profile, and contract tests together.
- Use the canonical company logo assets from `public/brand` through `BrandMark`.
- Keep clinic business data out until its dedicated work is approved. Production delivery is active; do not change deployment configuration during UI architecture work unless explicitly approved.
- Write code, code comments, repository documentation, and user-facing UI copy in English.
- Use package scripts for validation and run format, checks, relevant tests, Storybook, and build after code changes.
- Treat GitHub checks as advisory while the repository remains private on the current Free plan.
- Never place Vercel tokens, real auth secrets, clinic data, or private endpoints in repository content or logs. Configurable passwords belong in environment variables.
- Follow `docs/engineering/frontend-architecture.md` for frontend ownership, terminology, imports, props, Storybook, and test boundaries.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## UI Design

- Use pill-shaped labels and badges sparingly. Do not default to a pill whenever small contextual information needs emphasis.
- Prefer typography, spacing, grouping, inline metadata, icons, or separators before introducing a pill.
- Reserve pills for compact states, counts, or selectable filters when the enclosed shape communicates meaning or interaction. Do not use them for ordinary descriptive taxonomy or repeated labels unless an approved design specifically requires it.

## Codex Reviewers

- Before handoff, run `pnpm review:route --base origin/main --format json` after local validation and use the `$review-gate` skill to recommend the exact risk-based reviewer set.
- State every recommended and omitted reviewer with its routing reason. Ask for one explicit confirmation before any reviewer run.
- Treat route output as temporary current-task context. Do not persist route manifests, normalized finding files, or reviewer transcripts.
- Treat each reviewer's `sandbox_mode = "read-only"` configuration as the technical write boundary. Do not ask the user to change the parent task permission; the coordinator must perform no repository or external writes while the approved reviewer run is active.
- Run `planning_reviewer` separately and early when routed; run up to four implementation reviewers in parallel after implementation.
- Present all deduplicated findings before applying reviewer-driven fixes. Severity 7-10 blocks handoff and merge; severity 4-6 requires an explicit fix or deferral decision; severity 1-3 remains visible and advisory.
- A failed or incomplete reviewer blocks the gate until retry or an explicit documented exception. Do not routinely rerun reviewers after approved fixes; a material scope expansion starts a new approved review cycle.
- CI validates deterministic reviewer contracts only. It must not start AI reviewers.

## Pull Request Metadata Rules

- Title format: `<type>(optional-scope)?: short summary`; use only the types/scopes accepted by `.github/workflows/pr-gates.yml`; summary starts lowercase, imperative, and <= 72 chars.
- Use `.github/pull_request_template.md` and start with a bilingual `Management summary`: one non-technical German paragraph followed by the same non-technical English paragraph, release-note quality, focused on visible product, operator, or business value.
- Keep implementation detail in `## What changed`; include architectural or module-level context, link files only when useful for review, and do not paste code snippets into the PR body.
- In `## Points to review`, name only concrete focus areas from the current change, including exact paths, why they matter, what reviewers should verify, and existing evidence. Use `None beyond standard review.` when no special focus exists.
- In `## Validation`, check every relevant item and explain every unchecked, skipped, or not-applicable item directly in the section.
- In `## Development`, use `Closes` for every linked Issue, one line per Issue. Use `Closes #123` for same-repository Issues and `Closes findmydoc-platform/management#123` for trusted cross-repository Issues.
- Build PR descriptions in a temporary Markdown file or heredoc, pass them with `gh pr create --body-file` or `gh pr edit --body-file`, never inline multiline bodies through shell quoting, and verify the rendered body with `gh pr view --json body`.

## Vercel Production Delivery

- The canonical existing Vercel project for this repository is `clinic-dashboard` in the `findmydoc` team.
- Before every deployment, confirm that `.vercel/project.json` resolves to `clinic-dashboard` and that `vercel project inspect clinic-dashboard --scope findmydoc` succeeds.
- Production deployments must use a clean checkout of the latest `origin/main` and target only this existing project.
- Never create, link, or deploy to an alternative Vercel project unless the user explicitly approves it.

## Light And Dark Mode

- Treat light and dark mode as supported states for every UI change.
- Use light mode for the default handoff screenshot.
- Account for both themes in colors, surfaces, borders, states, charts, and image overlays. A separate dark-mode screenshot is not required by default.
- Require a dark-mode visual check and screenshot when a change affects theme behavior, colors, contrast, status states, overlays, or fixes a dark-mode regression.

## AI Anti-Slop Policy v2

### Priorities

1. Correctness and factual grounding.
2. Direct completion of the requested task.
3. Concise, readable output.

### Required Output Quality

- State concrete facts with file, command, test, or log evidence.
- Separate confirmed facts from recommendations and assumptions.
- Prefer direct, factual wording and the smallest change that fully satisfies the request.

### Uncertainty & Evidence

- Assumption: future authentication and data decisions remain explicit in `.codex/project-profile.toml`.
- Confidence: state a short confidence level when evidence is incomplete.

### Forbidden Patterns

- Do not use filler, cheerleading, or empty reassurance.
- Do not hide uncertainty behind authoritative wording.
- Do not add generic abstractions, duplicate instructions, or unnecessary examples.

### Scope & Brevity

- Keep instructions scoped to the closest applicable file.
- Keep examples short and include them only when they remove ambiguity.
- Run `pnpm ai:slop-check` after changing instruction sources.
