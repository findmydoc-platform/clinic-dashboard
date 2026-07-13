# Supabase Session and Payload API Profile

This profile is planned, not implemented.

## Boundary

- Supabase will establish the clinic user's session.
- Server-side clinic dashboard code will exchange or validate that identity for authorized Payload API requests.
- Payload remains the source of truth and the authorization boundary for clinic data.
- Platform staff continue to use Payload Admin.
- The clinic dashboard receives no direct Postgres connection and no Supabase service-role secret.

## Implementation Gate

Authentication, tenant authorization, Payload API contracts, session refresh, error handling, and security tests require a dedicated approved plan and issue. Do not infer those details from the foundation.
