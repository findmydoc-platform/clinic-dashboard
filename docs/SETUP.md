# Repository and Deployment Setup

This document records the foundation setup for `findmydoc-platform/clinic-dashboard`.

## GitHub

The repository is private and uses `main` as its default branch.

Available and configured:

- GitHub Actions checks for CI, PR gates, workflow security, deep quality, and Vercel preview deployment
- Read-only default `GITHUB_TOKEN` permissions
- Squash merges only
- Automatic deletion of merged branches
- Repository-level Actions secrets and variables
- Dependabot version updates without auto-merge

Available but advisory:

- Pull-request checks and reviews run and remain visible, but do not block merges.
- The team process requires green checks before merge.

Unavailable for this private repository on the current GitHub Free organization plan:

- Classic branch protection
- Repository rulesets, including Evaluate mode
- Required reviews or status checks
- Protected GitHub Environments and environment secrets
- Auto-merge

Direct pushes and merges with failing checks cannot be prevented by repository policy under this plan.

## Repository Actions Configuration

Repository secrets:

- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`

Repository variables:

- `VERCEL_DEPLOYMENTS_ENABLED=true`
- `VERCEL_PRODUCTION_DEPLOYMENTS_ENABLED=true`
- `DEPENDENCY_REVIEW_ENABLED=false`

The preview workflow accepts only non-draft, same-repository, non-Dependabot pull requests. It does not use GitHub Environments.

## Vercel

- Team: `findmydoc`
- Project: `clinic-dashboard`
- Framework: Next.js
- Node.js: 24.x
- Automatic Git deployments: disabled
- Vercel Deployment Protection: disabled; the application uses its own server-side Supabase authentication boundary
- Preview deployments: enabled through GitHub Actions
- Production deployments: enabled through the manually dispatched GitHub Actions workflow on `main`

The application requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYLOAD_API_URL`, `DASHBOARD_ORIGIN`, and `CSRF_SIGNING_SECRET` in Vercel preview and production. Preview uses Staging Supabase plus `https://preview.findmydoc.eu`; production uses Production Supabase plus `https://findmydoc.eu` and `https://clinics.findmydoc.eu`. The environment validator fails closed for missing, insecure, or cross-environment values. Vercel Deployment Protection remains an optional additional layer.

Keep the legacy `DASHBOARD_PASSWORD` Vercel values until the trusted preview proves login, reload, logout, invite, and recovery. Remove those unused values only as the final cutover cleanup; the application no longer reads them.

The dedicated team-scoped Vercel token is handed to GitHub through the clipboard or standard input. Never paste it into issues, pull requests, shell arguments, files, or logs.

## Production Domain

The intended production domain is `clinics.findmydoc.eu`.

Production aliasing and DNS remain intentionally pending. Create the externally managed DNS record required by Vercel and verify the domain before treating `clinics.findmydoc.eu` as live. Production deployments may use the Vercel production URL until that separate DNS step is complete.

## Acceptance

Before handoff:

1. Run formatting, static checks, unit tests, Storybook tests and build, Playwright smoke tests, and the Next.js build.
2. Confirm every advisory pull-request check appears.
3. Confirm the Vercel preview URL is public and data-less.
4. Confirm the production workflow deploys only from `main`; verify the Vercel production URL and record whether the custom domain is live.
