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

The pull-request Preview workflow accepts only non-draft, same-repository, non-Dependabot pull requests and publishes
only the generated temporary deployment URL. A separate `push` workflow deploys the merged `main` revision as a
Vercel Preview and moves the stable `clinics.preview.findmydoc.eu` alias to that deployment. Neither workflow uses
GitHub Environments.

## Vercel

- Team: `findmydoc`
- Project: `clinic-dashboard`
- Framework: Next.js
- Node.js: 24.x
- Automatic Git deployments: disabled
- Vercel Deployment Protection: disabled; the application uses its own server-side Supabase authentication boundary
- Pull-request Preview deployments: enabled through GitHub Actions with generated temporary URLs
- Main Preview deployments: enabled through GitHub Actions with the stable `clinics.preview.findmydoc.eu` alias
- Production deployments: enabled through the manually dispatched GitHub Actions workflow on `main`

The application requires `SUPABASE_URL`, `EXPECTED_SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`,
`PAYLOAD_API_URL`, `DASHBOARD_ORIGIN`, and `CSRF_SIGNING_SECRET` in Vercel preview and production. Preview uses Staging
Supabase, `https://preview.findmydoc.eu`, and the stable Clinic Dashboard origin
`https://clinics.preview.findmydoc.eu`; production uses Production Supabase plus
`https://findmydoc.eu` and `https://clinics.findmydoc.eu`. `SUPABASE_URL` must match the expected project reference
exactly. The environment validator fails closed for missing, insecure, or cross-environment values. Vercel Deployment
Protection remains an optional additional layer.

Vercel provides server-only `VERCEL_URL` for the current deployment. Preview requests may use that origin only when the
hostname matches `clinic-dashboard-*-findmydoc.vercel.app`, and the browser `Origin` must equal the request URL origin.
The exact stable Main Preview origin is `https://clinics.preview.findmydoc.eu`. Do not add a manual `NEXT_PUBLIC_*`
deployment URL.

The Main Preview workflow deploys only `refs/heads/main`, verifies that Vercel created a Preview target, assigns the
stable alias, and verifies that the alias resolves to the deployment created by the same workflow run. GoDaddy owns
the external DNS record. Until that record points to Vercel, the generated deployment URL remains the verification
surface.

## Supabase Staging Redirect Contract

The Staging Auth redirect allowlist preserves its existing entries and includes:

- `https://clinic-dashboard-*-findmydoc.vercel.app/**`
- `https://clinics.preview.findmydoc.eu/**`

Update hosted Staging Auth through a field-limited Management API `GET`/`PATCH` of `uri_allow_list`, then re-read the
field and compare the normalized result. Never store or print the Management API credential, project reference, full
Auth configuration, or unrelated settings. Production Auth, Site URL, and email templates are not part of this
contract. The invite and recovery templates must continue to use `RedirectTo`.

This repository documents the Dashboard consumer contract but does not own an incomplete `supabase/config.toml` or a
privileged configuration script. Shared executable Supabase desired state belongs in the operations configuration
layer.

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
4. Confirm pull requests retain generated temporary Preview URLs.
5. Confirm the Main Preview workflow deploys only `main` and moves `clinics.preview.findmydoc.eu` to that exact Preview.
6. Confirm the production workflow deploys only from `main`; verify the Vercel production URL and record whether the custom domain is live.
