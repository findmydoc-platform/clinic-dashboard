# Clinic Dashboard architecture

## Context and scope

The Clinic Dashboard is the standalone workspace for clinic staff. It owns the staff interface, server-side sessions,
and the Backend for Frontend (BFF). Supabase issues sessions. The Website's Payload application owns clinic staff
authorization, business data, and the API the Dashboard consumes. Platform staff use Payload Admin.

The [shared platform arc42](https://github.com/findmydoc-platform/platform-architecture#read-the-architecture) covers the
cross-application context and responsibilities. GitHub access is required. Start with the local guides below if that
repository is unavailable, and record which shared sources you could not check.

## Building blocks and runtime

The Next.js App Router composes the protected workspace on the server. React Server Components call the server-only
data layer directly. Browser actions call capability-specific Route Handlers on the Dashboard origin. The BFF sends
the current user access token to Payload through domain providers. Payload checks current staff and clinic access
on each request. The Dashboard keeps credentials server-side and owns no business database or durable business cache.

The [authentication and BFF guide](docs/authentication-and-bff.md) owns the Dashboard request path, session lifecycle,
and security boundaries. Start at the [session and cookie contract](docs/authentication-and-bff.md#session-and-cookie-contract)
or [initial page recovery](docs/authentication-and-bff.md#initial-page-recovery-and-writable-requests) for authentication.
For endpoint shapes, DTOs, and Payload authorization, use the
[Website-owned provider contract](https://github.com/findmydoc-platform/website/blob/main/docs/integrations/clinic-dashboard-api.md).

The [frontend architecture](docs/engineering/frontend-architecture.md) explains which routes, workspace components,
and features own composition, business behavior, and presentation. It also covers Atomic Design and Storybook. The
[design system](DESIGN.md) owns visual rules and component states.

## Deployment and runtime evidence

The [environment contract](docs/authentication-and-bff.md#environment-contract) pairs local and Preview with Supabase
Staging and Website Preview, and Production with its own Supabase project and Website Production. See
[deployment setup](docs/SETUP.md) and [delivery](README.md#delivery) for GitHub Actions and Vercel.

The [runtime status guide](docs/authentication-and-bff.md#runtime-status-and-scope) points to the provider composition
and the Preview and Production acceptance issues. Use deployment records to identify the running revision and acceptance
evidence to confirm availability in that environment.

## Cross-cutting constraints

The [public route registry](src/lib/security/public-routes.ts) defines which routes allow unauthenticated access.
The application opts out of indexing through [page metadata](src/app/layout.tsx), [robots.txt](src/app/robots.ts),
and [response headers](vercel.json). Session cookies are host-bound and `HttpOnly`. The
[mutation guard](docs/authentication-and-bff.md#csrf-and-origin-contract) checks the origin and session-bound CSRF token.
The [cache contract](docs/authentication-and-bff.md#cache-contract) keeps authenticated reads private and preserves
Website revalidation for mutations that affect public pages.

## Architecture decisions

- [Platform ADR 026](https://github.com/findmydoc-platform/platform-architecture/blob/main/decisions/026-adr-standalone-clinic-dashboard-bff-architecture.md)
  records why the Dashboard is standalone and how the BFF keeps the Payload boundary server-side.
- [Dashboard ADR 0001](docs/adr/0001-design-sync.md) records the design synchronization decision.
- [Dashboard ADR 0002](docs/adr/0002-feature-first-atomic-architecture.md) records feature-first frontend ownership and
  the role of Atomic Design.
- [Dashboard ADR 0003](docs/adr/0003-domain-data-provider-composition.md) records how the server selects Payload or
  controlled test providers.

## Verification

- [CI path routing](docs/engineering/ci-path-routing.md) explains when docs, application tests, and deployments run.
- [Cross-app inquiry acceptance](docs/testing/inquiry-communication-adoption.md) explains how to run the local synthetic
  Website and Dashboard test lane.
- [Focused clinic access mutation testing](docs/testing/clinic-access-mutation-testing.md) explains how to test the
  Dashboard's clinic-access resolver.
