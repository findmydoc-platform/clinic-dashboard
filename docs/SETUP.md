# Repository and Deployment Setup

This document records the foundation setup for `findmydoc-platform/clinic-dashboard`.

## GitHub

The repository is public and uses `main` as its default branch.

Available and configured:

- GitHub Actions checks for CI, PR gates, workflow security, deep quality, and Vercel preview deployment
- Dependency Review for pull requests, failing on high-severity dependency changes
- GitHub secret scanning and push protection
- An active production ruleset for `main` that requires pull requests, blocks deletion and non-fast-forward updates, and
  enforces the configured code-scanning and code-quality thresholds
- Read-only default `GITHUB_TOKEN` permissions
- Squash merges only
- Automatic deletion of merged branches
- Repository-level Actions secrets and variables
- Dependabot version and security updates without auto-merge

Available but advisory:

- The production ruleset does not require an approving review; the team can merge after the required automated checks
  pass.

## Repository Actions Configuration

Repository secrets:

- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`

Repository variables:

- `VERCEL_DEPLOYMENTS_ENABLED=true`
- `VERCEL_PRODUCTION_DEPLOYMENTS_ENABLED=true`
- `DEPENDENCY_REVIEW_ENABLED=true`

The pull-request Preview workflow accepts only non-draft, same-repository, non-Dependabot pull requests and publishes
only the generated temporary deployment URL. Production runs only through the central platform release, which invokes
the repository's `platform-release-deploy` workflow with a frozen target SHA and shared version. Neither workflow uses
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
- Production deployments: enabled only through the central platform release

The application requires `SUPABASE_URL`, `EXPECTED_SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`,
`PAYLOAD_API_URL`, `DASHBOARD_ORIGIN`, and `CSRF_SIGNING_SECRET` in Vercel preview and production. Preview uses Staging
Supabase, `https://preview.findmydoc.eu`, and the stable Clinic Dashboard origin
`https://clinics.preview.findmydoc.eu`; production uses Production Supabase plus
`https://findmydoc.eu` and `https://clinics.findmydoc.eu`. `SUPABASE_URL` must match the expected project reference
exactly. The environment validator fails closed for missing, insecure, or cross-environment values. Vercel Deployment
Protection remains an optional additional layer.

Server-side exception capture uses `POSTHOG_PROJECT_API_KEY` and `POSTHOG_HOST` as protected deployment configuration;
neither is a `NEXT_PUBLIC_*` variable. The workflow supplies `DEPLOYMENT_ENVIRONMENT` and a full
`DEPLOYMENT_COMMIT_SHA` to the build and deployment runtime. Central Production additionally supplies the shared
`RELEASE_VERSION` in `vX.Y.Z` form; Preview does not set a release version. These values are deployment-scoped, rather
than durable Vercel project variables.

Server exceptions use `application=dashboard` and `server:dashboard` as their fixed server identity. Development and
tests do not create a PostHog client or send telemetry; they emit the sanitized exception context as
`telemetry.posthog.exception_local`. The context excludes headers, cookies, credentials, and URL query parameters.
The original exception object, message, and stack remain unchanged for diagnosis in PostHog and local server logs.
Developers must not include secrets, access credentials, patient data, medical free text, or raw request data in
exception messages. Treat any real incident that violates this rule as a telemetry privacy defect and tighten the
capture boundary based on that evidence.

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
6. Confirm the central platform release is the only production path and uses its frozen SHA and shared version.
