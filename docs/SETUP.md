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
- `VERCEL_PRODUCTION_DEPLOYMENTS_ENABLED=false`
- `DEPENDENCY_REVIEW_ENABLED=false`

The preview workflow accepts only non-draft, same-repository, non-Dependabot pull requests. It does not use GitHub Environments.

## Vercel

- Team: `findmydoc`
- Project: `findmydoc-clinic-dashboard`
- Framework: Next.js
- Node.js: 24.x
- Automatic Git deployments: disabled
- Vercel Deployment Protection: disabled; the application-level temporary password guard is enabled
- Preview deployments: enabled through GitHub Actions
- Production deployments: disabled

The application guard requires `DASHBOARD_PASSWORD` in Vercel preview and production environments. Only local development and automated tests may fall back to the initial temporary `findmydoc` password. A deployed environment without `DASHBOARD_PASSWORD` fails closed. Vercel Deployment Protection is a separate additional layer and can be enabled later without changing the application code.

The dedicated team-scoped Vercel token is handed to GitHub through the clipboard or standard input. Never paste it into issues, pull requests, shell arguments, files, or logs.

## Production Domain

The intended production domain is `clinics.findmydoc.eu`.

Production aliasing and DNS remain intentionally pending. When production is approved, create the externally managed DNS record required by Vercel and verify the domain before enabling the production deployment variable. Do not change DNS as part of the foundation preview.

## Acceptance

Before handoff:

1. Run formatting, static checks, unit tests, Storybook tests and build, Playwright smoke tests, and the Next.js build.
2. Confirm every advisory pull-request check appears.
3. Confirm the Vercel preview URL is public and data-less.
4. Confirm production remains disabled and no production alias is live.
