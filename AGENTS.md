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

## Codex Reviewers

- Before handoff, use the `$review-gate` skill after local validation. It is the authoritative source for reviewer routing, approval, execution, finding handling, severity gates, and retained artifacts; never run AI reviewers without explicit user approval.
- CI validates deterministic reviewer contracts only. It must not start AI reviewers.

## Pull Request Metadata Rules

- Use `.github/PULL_REQUEST_TEMPLATE.md` as the authoritative PR-body contract and keep every section complete. Use a conventional title accepted by `.github/workflows/pr-gates.yml`; keep its summary imperative and <= 72 characters.
- Build PR descriptions in a temporary Markdown file or heredoc, pass them with `gh pr create --body-file` or `gh pr edit --body-file`, never inline multiline bodies through shell quoting, and verify the rendered body with `gh pr view --json body`.

## Vercel Production Delivery

- The canonical existing Vercel project for this repository is `clinic-dashboard` in the `findmydoc` team.
- Before every deployment, confirm that `.vercel/project.json` resolves to `clinic-dashboard` and that `vercel project inspect clinic-dashboard --scope findmydoc` succeeds.
- Production deployments must use a clean checkout of the latest `origin/main` and target only this existing project.
- Never create, link, or deploy to an alternative Vercel project unless the user explicitly approves it.
