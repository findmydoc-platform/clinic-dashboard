# findmydoc Clinic Dashboard

Standalone Next.js foundation for the future clinic staff workspace.

The current release is a data-less preview protected by a temporary password guard. It has no clinic data, database connection, or Payload API integration. Supabase authentication and business modules remain follow-up work.

## Foundation

- Next.js App Router, React, TypeScript, Node 24, pnpm 10, and Tailwind CSS 4
- Atomic Design, shadcn/ui primitives, DM Sans, and Storybook
- Vitest, Storybook browser tests, Playwright smoke coverage, and production builds
- Advisory GitHub Actions checks and Vercel preview deployments
- `noindex` metadata, `robots.txt`, and Vercel `X-Robots-Tag` headers
- Temporary password guard; set `DASHBOARD_PASSWORD` in Vercel to override the initial `findmydoc` password
- Template source: `findmydoc-platform/findmydoc-codex-web-template@140506999206dd2d9cade862e218e9b489eebad4`

## Local Development

1. Use Node 24 and pnpm 10.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Start the application with `pnpm dev`.
4. Open `http://localhost:3000`.

The initial guard uses `findmydoc` when `DASHBOARD_PASSWORD` is not set. This is intentionally temporary and must be replaced before real clinic data is connected.

## Validation

Run:

    pnpm format:check
    pnpm check
    pnpm ai:slop-check
    pnpm test:unit
    pnpm test:storybook
    pnpm build-storybook
    pnpm test:e2e:smoke
    pnpm build

## Delivery

Pull-request checks are advisory on the current private GitHub Free repository: failures are visible but do not technically block a merge. Preview deployments run through GitHub Actions and repository-level Vercel credentials. Production deployment remains disabled.

See `docs/SETUP.md` for the verified GitHub/Vercel setup and the pending `clinics.findmydoc.eu` DNS step.
