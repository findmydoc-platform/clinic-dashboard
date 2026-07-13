# Storage Decision Matrix

## Static JSON

Use versioned JSON only for non-secret configuration that changes through reviewed Git commits. Do not write JSON files at runtime on Vercel.

## Object Storage

Use object storage for small mutable file objects where relational queries, concurrent editing, and transactions are not required. Define access control and retention before storing user content.

## Postgres

Use Postgres for user data, business data, personal data, sensitive data, queryable state, audit requirements, relationships, or concurrent writers. The selected Supabase profile must use migrations and Row Level Security.
