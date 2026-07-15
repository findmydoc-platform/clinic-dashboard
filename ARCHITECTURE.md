# Architecture

## Application Shape

The application uses the Next.js App Router and React Server Components by default. The protected root page remains a server boundary; its fixture-backed app controller is a client component because navigation and dialogs are intentionally local UI state.

Atomic Design defines the UI boundary:

- Atoms are visual primitives.
- Molecules compose atoms without route or data ownership.
- Organisms assemble product surfaces.
- Templates own layout.
- Route files own page composition and future server-side access decisions.

## Current Access Boundary

The unauthenticated surface exposes only `/login`, `/api/auth/login`, `/api/health`, and `/robots.txt`. The data-less dashboard route `/` uses a temporary server-side password guard, and all application responses emit `noindex` headers. Vercel Deployment Protection remains a separate optional layer and is currently disabled.

Future clinic access will use a Supabase session and server-authorized Payload API requests. Authorization must be checked at the server-side data boundary, not only in Next.js proxy logic.

## Data Boundary

The app shell has no persistence and no clinic data. Its presentation content is deterministic fixture data, and its complete visual reference is isolated in Storybook. Payload remains the planned source of truth. The clinic dashboard must not receive direct database access or service-role secrets.

## Prototype visibility boundary

The app exposes only `visual-reference` and `presentation` variants. `/` always renders `presentation`; Storybook renders both. Visibility configuration is not authorization, has no user-facing toggle, and must be removed gate by gate when a server-authorized capability replaces it.

## Delivery Boundary

GitHub Actions owns validation and Vercel deployments. Pull-request checks are advisory on the current GitHub plan. Preview deployment is enabled; production deployment is guarded by an explicit repository variable that defaults to disabled.
