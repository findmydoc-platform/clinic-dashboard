# Architecture

## Application Shape

The application uses the Next.js App Router and React Server Components by default. Client components are limited to interaction leaves such as the theme control.

Atomic Design defines the UI boundary:

- Atoms are visual primitives.
- Molecules compose atoms without route or data ownership.
- Organisms assemble product surfaces.
- Templates own layout.
- Route files own page composition and future server-side access decisions.

## Current Access Boundary

The foundation exposes only `/` and `/api/health`. Both endpoints are data-less and the preview emits `noindex` headers. There is no application login in this release, and Vercel Deployment Protection is not the planned application security boundary.

Future clinic access will use a Supabase session and server-authorized Payload API requests. Authorization must be checked at the server-side data boundary, not only in Next.js proxy logic.

## Data Boundary

The foundation has no persistence and no clinic data. Payload remains the planned source of truth. The clinic dashboard must not receive direct database access or service-role secrets.

## Delivery Boundary

GitHub Actions owns validation and Vercel deployments. Pull-request checks are advisory on the current GitHub plan. Preview deployment is enabled; production deployment is guarded by an explicit repository variable that defaults to disabled.
