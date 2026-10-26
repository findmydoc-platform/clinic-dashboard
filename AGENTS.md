# findmydoc Clinic Dashboard

## Project Profile

Read `.codex/project-profile.toml` before implementation work. Bootstrap decisions are complete.

The application uses server-side Supabase sessions and the authorized Payload bootstrap for clinic identity. Its normal-mode server composition selects domain-specific Payload providers while some presentation content remains demo data; see the [capability status](docs/authentication-and-bff.md#runtime-status-and-scope) before describing a domain as live in an environment. Payload is the source of truth for identity and authorization; do not add direct database access or service-role credentials to this application.

## Fixed Standards

- Use Next.js, React, TypeScript, Node 24, pnpm 10, Tailwind 4, shadcn/ui, Storybook, Vitest, and Playwright.
- Keep the unauthenticated surface limited to the routes registered in `src/lib/security/public-routes.ts`; update the registry, project profile, and contract tests together.
- Use the canonical company logo assets from `public/brand` through `BrandMark`.
- Keep clinic business reads and changes behind the authorized domain-specific BFF providers. Production delivery is active; do not change deployment configuration during UI architecture work unless explicitly approved.
- Write code, code comments, repository documentation, and user-facing UI copy in English.
- Before handoff, follow `README.md#validation`. The pre-commit hook formats staged files; do not run `pnpm format` manually.
- For deployment, follow [Delivery](README.md#delivery).
- Treat GitHub checks as advisory while the repository remains private on the current Free plan.
- Never place Vercel tokens, real auth secrets, clinic data, or private endpoints in repository content or logs. Configurable passwords belong in environment variables.
- Follow `docs/engineering/frontend-architecture.md` for frontend ownership, terminology, imports, props, Storybook, and test boundaries.

## Engineering Method Anchors

- Semantic Anchors: Use [https://llm-coding.github.io/Semantic-Anchors/llms.txt](https://llm-coding.github.io/Semantic-Anchors/llms.txt) to identify established methods; name them without redefining them locally.
- Use ADR according to Nygard.
- Use Freeman and Pryce's Outside-In TDD.
- Use Kent Beck's Test Desiderata.
- Use Parnas's Information-Hiding Criterion.
- Use Robert C. Martin's Dependency Rule.
- Use Luke Wroblewski's Mobile First.
- Use Ethan Marcotte's Responsive Web Design.
- Use WCAG 2.2 AA.
- Use the WAI-ARIA Modal Dialog Pattern.
- Apply Outside-In TDD only to changes in observable behavior and bug fixes; do not apply it to documentation-only, configuration-only, or exploratory work.
- Repository-specific rules in this instruction hierarchy remain authoritative.

## Platform Architecture

For questions spanning Clinic Dashboard and Website, start with the [shared platform architecture](https://github.com/findmydoc-platform/platform-architecture) when GitHub access is available. If access is unavailable, use the local application documentation and state that the shared architecture could not be checked. This repository remains authoritative for its BFF, session, and frontend implementation. Follow links to the relevant local documentation before changing code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Codex Reviewers

- Before handoff, use the `$review-gate` skill after local validation. It is the authoritative source for reviewer routing, the Dependabot patch exception, approval, execution, finding handling, severity gates, and retained artifacts; never run AI reviewers without explicit user approval.
- CI validates deterministic reviewer contracts only. It must not start AI reviewers.

## Pull Request Metadata Rules

- Use `.github/PULL_REQUEST_TEMPLATE.md` as the authoritative PR-body contract and keep every section complete. Use a conventional title accepted by `.github/workflows/pr-gates.yml`; keep its summary imperative and <= 72 characters.
- Build PR descriptions in a temporary Markdown file or heredoc, pass them with `gh pr create --body-file` or `gh pr edit --body-file`, never inline multiline bodies through shell quoting, and verify the rendered body with `gh pr view --json body`.
