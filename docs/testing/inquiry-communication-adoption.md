# Cross-app inquiry acceptance

The adoption lane uses only synthetic identities and content. It starts an isolated Website/Payload/Postgres/S3Mock stack, a local Supabase identity stub, and the Clinic Dashboard. The Dashboard keeps controlled authentication for its shell but routes only inquiry communication through the real Website contract. No Preview, production, generic Payload collection route, or fixture-backed inquiry provider is accepted as a fallback.

Run from the Clinic Dashboard checkout:

```bash
INQUIRY_ACCEPTANCE_WEBSITE_DIR=/path/to/website pnpm test:e2e:cross-app
```

The [cross-app test](../../tests/e2e/inquiry-cross-app.spec.ts) proves the repository boundary and the two-way exchange.
See [management #365](https://github.com/findmydoc-platform/management/issues/365) for adoption requirements and
[Dashboard PR #130](https://github.com/findmydoc-platform/clinic-dashboard/pull/130) for the implementation and
original scenario evidence. Verify Preview authentication and real email delivery separately after deployment. Delivery
tracking is in [management #373](https://github.com/findmydoc-platform/management/issues/373).
