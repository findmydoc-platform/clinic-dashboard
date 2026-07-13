# findmydoc Clinic Dashboard

Standalone Next.js foundation for the future clinic staff workspace.

The current release is a public, data-less preview. It has no login, clinic data, database connection, or Payload API integration. Authentication and business modules are intentionally tracked as follow-up work.

## Foundation

- Next.js App Router, React, TypeScript, Node 24, pnpm 10, and Tailwind CSS 4
- Atomic Design, shadcn/ui primitives, DM Sans, and Storybook
- Vitest, Storybook browser tests, Playwright smoke coverage, and production builds
- Advisory GitHub Actions checks and Vercel preview deployments
- Template source: `findmydoc-platform/findmydoc-codex-web-template@140506999206dd2d9cade862e218e9b489eebad4`

## Local Development

1. Use Node 24 and pnpm 10.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Start the application with `pnpm dev`.
4. Open `http://localhost:3000`.

No runtime secrets are required for the foundation.

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
