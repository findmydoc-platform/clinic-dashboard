# Inquiry communication adoption evidence

The adoption lane uses only synthetic identities and content. It starts an isolated Website/Payload/Postgres/S3Mock stack, a local Supabase identity stub, and the Clinic Dashboard. The Dashboard keeps controlled authentication for its shell but routes only inquiry communication through the real Website contract. No Preview, production, generic Payload collection route, or fixture-backed inquiry provider is accepted as a fallback.

Run from the Clinic Dashboard checkout:

```bash
INQUIRY_ACCEPTANCE_WEBSITE_DIR=/path/to/website pnpm test:e2e:cross-app
```

## Binding scenario coverage

| management#365 scenario             | Evidence                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Bound exchange                   | `tests/e2e/inquiry-cross-app.spec.ts`; Website `inquiryCommunication.lifecycle.test.ts`              |
| 2. Email notifications              | Website notification outbox contract tests; Preview delivery smoke remains blocked by management#373 |
| 3. Tenant and role separation       | Cross-app foreign-clinic assertion; Website HTTP and lifecycle integration tests                     |
| 4. Clinic queue                     | Cross-app deep link and real queue; Dashboard provider, unit, and browser-story tests                |
| 5. Personal unread                  | Website lifecycle integration tests; Dashboard controller, unit, and browser-story tests             |
| 6. Closed, reopened, concurrency    | Website lifecycle integration tests; Dashboard recovery stories                                      |
| 7. Private attachments              | Website real S3Mock integration; Dashboard attachment E2E                                            |
| 8. Errors, retry, session loss      | Website endpoint contracts; Dashboard controller, BFF, and browser-story tests                       |
| 9. Spam and contact                 | Website lifecycle and HTTP tests; Dashboard provider and browser-story tests                         |
| 10. Moderation and appeal           | Website moderation lifecycle integration tests; patient and clinic projection tests                  |
| 11. Anonymize, hard delete, restore | Website retention lifecycle, HTTP, and S3Mock integration tests; Dashboard deleted-package stories   |
| 12. Offboarding and retention       | Website retention lifecycle and policy tests                                                         |
| 13. Legacy cutover                  | Website migration upgrade/down tests and absence of the removed legacy bridge                        |

The local lane proves the repository boundary and the two-way exchange. Preview authentication is verified after deployment. Real email delivery is deliberately not claimed until management#373 is complete.
