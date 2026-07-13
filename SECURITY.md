# Security Policy

## Reporting

Do not open public issues for vulnerabilities or suspected data exposure. Use GitHub Private Vulnerability Reporting when available and the internal security contact otherwise.

## Current Security Posture

- The public preview is data-less and exposes only `/` and `/api/health`.
- Preview responses and metadata use `noindex`.
- No authentication, clinic data, database connection, or Payload credentials exist in this foundation.
- GitHub Actions use read-only permissions by default and pin third-party actions to commit SHAs.
- Vercel credentials are repository secrets and are never available to fork pull requests or Dependabot.
- Production deployment is disabled through `VERCEL_PRODUCTION_DEPLOYMENTS_ENABLED=false`.

## Planned Access Boundary

The future login will use a Supabase session and server-authorized Payload API access. Do not add direct database access, service-role credentials, or client-only authorization checks.

## GitHub Plan Limitation

Pull-request checks are advisory. The current private repository cannot configure branch protection or rulesets on the organization's Free plan, so users with write access can merge or push despite failing checks.
