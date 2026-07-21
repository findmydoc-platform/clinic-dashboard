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

Recommend matching read-only reviewers before handoff and ask for confirmation before running them. Present all findings before applying reviewer-driven fixes.

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
