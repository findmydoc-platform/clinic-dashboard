## Outcome

<!-- State the user or engineering outcome. Link the issue with Closes, Fixes, or Resolves #123. -->

## Changes

<!-- Summarize the smallest meaningful change set. -->

## Validation

Checks are advisory on the current GitHub plan. Do not merge while any applicable check is failing.

- [ ] `pnpm format:check`
- [ ] `pnpm check`
- [ ] Relevant unit, Storybook, or E2E tests
- [ ] `pnpm build-storybook` when UI-relevant
- [ ] `pnpm build` when build-relevant

## Access and data

- Public/private decision: <!-- current foundation routes are public and data-less -->
- Data classification: <!-- none, internal, personal, sensitive -->
- Auth or permission impact: <!-- none or describe -->

## Risks and rollback

<!-- Describe the main risk, monitoring signal, and rollback path. -->

## Out of scope

<!-- Record intentionally excluded work. -->
