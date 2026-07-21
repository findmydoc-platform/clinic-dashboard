# Security Policy

## Reporting

Do not open public issues for vulnerabilities or suspected data exposure. Use GitHub Private Vulnerability Reporting when available and the internal security contact otherwise.

## Current Security Posture

- The public auth and health routes are inventoried in `src/lib/security/public-routes.ts`; all other application pages require a Supabase session or approved Payload bootstrap.
- All application responses and metadata use `noindex`; `robots.txt` disallows crawling.
- Supabase session material stays in host-bound, `HttpOnly`, `SameSite=Lax` cookies. Browser code receives no access or refresh token and creates no Supabase browser client.
- Public and authenticated auth mutations require exact origin, JSON content type, and a signed HMAC-CSRF token. Auth and session responses are private and not cacheable.
- The server-only Payload client sends only the current access token to the configured HTTPS bootstrap endpoint, rejects redirects, and validates the exact response DTO.
- No clinic business data, direct database connection, service-role credential, or generic Payload proxy exists in this application.
- GitHub Actions use read-only permissions by default and pin third-party actions to commit SHAs.
- Vercel credentials are repository secrets and are never available to fork pull requests or Dependabot.
- Production deployment is disabled through `VERCEL_PRODUCTION_DEPLOYMENTS_ENABLED=false`.

## Access Boundary

Payload remains authoritative for clinic staff approval, assignment, and capabilities. A `401` receives one refresh and retry; a second `401` clears the local session, while `403` and `503` preserve it. Do not add direct database access, service-role credentials, or client-only authorization checks.

## GitHub Plan Limitation

Pull-request checks are advisory. The current private repository cannot configure branch protection or rulesets on the organization's Free plan, so users with write access can merge or push despite failing checks.
