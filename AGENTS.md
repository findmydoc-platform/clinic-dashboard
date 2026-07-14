# findmydoc Clinic Dashboard

## Project Profile

Read `.codex/project-profile.toml` before implementation work. Bootstrap decisions are complete.

The current application is a data-less foundation preview with a temporary password guard. Supabase authentication and authorized Payload API access are planned but not implemented. Payload remains the future source of truth; do not add direct database access or service-role credentials to this application.

## Fixed Standards

- Use Next.js, React, TypeScript, Node 24, pnpm 10, Tailwind 4, Atomic Design, shadcn/ui, Storybook, Vitest, and Playwright.
- Keep the current unauthenticated surface limited to `/login`, `/api/auth/login`, `/api/health`, and `/robots.txt`; document any change in `src/lib/security/public-routes.ts` and its tests.
- Use the canonical company logo assets from `public/brand` through `BrandMark`.
- Keep clinic data, Supabase authentication, Payload integration, and production deployment out until their dedicated work is approved. The temporary password guard is the only approved access layer for the initial preview.
- Write code, code comments, repository documentation, and user-facing UI copy in English.
- Use package scripts for validation and run format, checks, relevant tests, Storybook, and build after code changes.
- Treat GitHub checks as advisory while the repository remains private on the current Free plan.
- Never place Vercel tokens, real auth secrets, clinic data, or private endpoints in repository content or logs. Configurable passwords belong in environment variables.

## Codex Reviewers

Recommend matching read-only reviewers before handoff and ask for confirmation before running them. Present all findings before applying reviewer-driven fixes.

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
