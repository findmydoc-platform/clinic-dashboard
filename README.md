# findmydoc Clinic Dashboard

Standalone Next.js clinic staff workspace.

The current release authenticates clinic staff with server-side Supabase sessions and resolves approved staff and clinic identity through the Payload bootstrap API. Its dashboard cards, charts, messages, reviews, profile details, and interactions remain deterministic fixture data and are visibly marked as demo data. It has no direct database connection, service-role credential, or browser Supabase client.

## Preview app shell

- Next.js App Router, React, TypeScript, Node 24, pnpm 10, and Tailwind CSS 4
- Atomic Design, shadcn/ui primitives, DM Sans, and Storybook
- Vitest, Storybook browser tests, Playwright smoke coverage, and production builds
- Advisory GitHub Actions checks and Vercel preview deployments
- `noindex` metadata, `robots.txt`, and Vercel `X-Robots-Tag` headers
- Host-bound, `HttpOnly` Supabase session cookies with server-only login, refresh, callback, and logout
- Real staff and clinic identity from `GET /api/clinic-dashboard/bootstrap`
- In-app navigation between Dashboard, Messages, Reviews, and Clinic profile without route reloads
- `presentation` mode at `/` and complete `visual-reference` coverage in Storybook
- Template source: `findmydoc-platform/findmydoc-codex-web-template@140506999206dd2d9cade862e218e9b489eebad4`

## Local Development

1. Use Node 24 and pnpm 10.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` and provide the Staging Supabase, preview Payload, origin, and CSRF values.
4. Start the application with `pnpm dev`.
5. Open `http://localhost:3000`.

Required server-only variables are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PAYLOAD_API_URL`, `DASHBOARD_ORIGIN`, and a `CSRF_SIGNING_SECRET` containing at least 32 random bytes. Do not add `NEXT_PUBLIC_*` authentication variables, a Supabase service-role key, or database credentials. Automated browser tests use a controlled local-only auth mode that the environment validator rejects in deployed environments.

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

Pull-request checks are advisory on the current private GitHub Free repository: failures are visible but do not technically block a merge. Preview and manually dispatched production deployments run through GitHub Actions and repository-level Vercel credentials. Production deployments are restricted to `main`.

See `docs/SETUP.md` for the verified GitHub/Vercel setup and the pending `clinics.findmydoc.eu` DNS step.
