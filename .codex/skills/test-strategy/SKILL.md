---
name: test-strategy
description: Select focused unit, browser-story, integration, and end-to-end tests.
---

# Test Strategy

Add unit tests for policy and business logic. Use browser Storybook tests for component interaction and accessibility.

Select integration tests according to the affected approved system boundary and its risk, including authentication, BFF routes, and domain providers. Persistent storage is not a prerequisite. Use controlled sessions, synthetic data, and resettable provider state for database-free tests.

Use controlled sessions for end-to-end auth coverage. Passing controlled tests does not verify real services in Preview or Production.
