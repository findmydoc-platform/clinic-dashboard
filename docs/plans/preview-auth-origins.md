# Preview Authentication Origins Plan

## Outcome and Audience

Clinic staff can request and complete invite or recovery flows on the exact Vercel preview deployment they opened.
The existing stable preview origin remains the fallback, and `https://dashboard.preview.findmydoc.eu` is already
recognized as a future exact preview origin without becoming canonical before its DNS and Vercel alias exist.

The change serves clinic staff testing preview authentication and developers validating pull-request deployments.

## Scope and Access Decision

- Keep all authentication requests same-origin and server-side.
- In Preview, trust the configured stable origin, the current deployment origin derived from validated server-only
  `VERCEL_URL`, and the exact future custom preview origin.
- Require the browser `Origin` to equal the request URL origin for every state-changing request.
- Keep Production restricted to its single configured origin.
- Add only the project-and-team-scoped Vercel wildcard and future custom preview origin to the Staging Supabase redirect
  allowlist.

The public route inventory and HTTP response contracts do not change. Authentication cookies remain host-only, so a
session or completion state created on one preview host is not shared with another preview host.

## Data and UI

Authentication tokens, sessions, Supabase configuration, and Management API credentials remain private. No token,
project reference, full Auth configuration, or clinic data is added to repository content or browser-visible
configuration.

There is no UI or copy change. The existing password reset, confirmation, password completion, login, and access-denied
screens continue to render their current states.

## Verification and Delivery

- Unit-test environment validation, trusted-origin selection, CSRF same-origin enforcement, recovery callback
  generation, callback continuation, invalid-origin rejection, and Production isolation.
- Run formatting, static checks, unit tests, Storybook tests and build, Chromium end-to-end tests, and the Next.js build.
- Update only Staging `uri_allow_list` through a field-limited Management API patch, preserve unrelated entries, and
  verify the normalized value by re-reading it.
- Deploy a direct Vercel Preview to the existing `clinic-dashboard` project and complete a fresh recovery flow on its
  generated URL.
- Recommend security and test reviewers before handoff and run them only after confirmation.
- Merge only accepted, validated changes. Deploy Production from a clean checkout of the latest `origin/main`;
  Production Supabase configuration remains unchanged.

## Risks and Rollback

- A broad hostname rule could admit unrelated Vercel deployments. The application therefore accepts only the exact
  current `VERCEL_URL` after validating the `clinic-dashboard-*-findmydoc.vercel.app` shape.
- Switching hosts mid-flow would lose host-bound cookies. Reset and callback redirects therefore stay on the validated
  initiating origin.
- Supabase configuration replacement could remove unrelated redirects. The update merges the two required Preview
  patterns into the existing list and patches only `uri_allow_list`.
- Rollback redeploys the previous application revision and removes only the two added Staging allowlist entries after a
  verified re-read.

## Explicit Non-goals

- Production Supabase, Site URL, email-template, DNS, or Vercel-domain changes.
- A generic `*.vercel.app` application allowlist.
- Cross-host session or cookie sharing.
- A Supabase configuration script or incomplete `supabase/config.toml` in this repository; privileged shared
  configuration remains owned by the operations configuration layer.

Cache impact: `no-public-impact`.
