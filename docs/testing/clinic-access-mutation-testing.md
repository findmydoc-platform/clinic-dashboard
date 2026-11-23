# Focused clinic access mutation testing

This pilot implements [issue #105](https://github.com/findmydoc-platform/clinic-dashboard/issues/105).
It checks whether tests detect changes to clinic selection, operation capabilities, and session requirements
in `resolveClinicDashboardRouteAccess`.

## Running a focused check

Use Node 24 and pnpm 10. Run `pnpm install --frozen-lockfile` after checking out this branch.
The [package manifest](../../package.json) pins StrykerJS and the Vitest runner.

The repeatable clinic-access check is defined as `test:mutation:clinic-access` in `package.json`.
That script fixes the production-code range and both test files. Running it does not require selecting files
or copying arguments from this document.

Run the setup check first:

```sh
pnpm test:mutation:clinic-access --dryRunOnly
```

Run the saved selection with mutation execution:

```sh
pnpm test:mutation:clinic-access
```

A full run first executes the original behavior with mutations inactive. Failing initial tests stop the run
before mutant execution. A full run that generates no mutants fails rather than reporting a successful pilot.

For other focused investigations, the general `pnpm test:mutation` command still requires an explicit
`--mutate <src-file[:start-end]>` selection and one or more `--testFiles <test-file>` arguments. Paths must be
relative to the repository root. Glob selection, missing files, test files as mutation targets, and unknown
options are rejected. Pass literal filenames and quote paths containing shell metacharacters. The command
encodes dynamic segments and route groups for Stryker while preserving the line range.

The dedicated Node Vitest configuration uses the application's existing aliases and test setup. It does not
load Storybook or browser projects. The runner is registered explicitly so pnpm's dependency layout does not
depend on plugin glob discovery. Two workers execute the mutations.

Stryker works in temporary copies under `.stryker-tmp`. Environment files and local Vercel state are excluded
from those copies. The temporary directory is ignored by Git, TypeScript, and ESLint. HTML and JSON reports
are written to `coverage/mutation/mutation.html` and `coverage/mutation/mutation.json`, which Git also ignores.
Each completed mutation run replaces these reports.

There is no default repository-wide selection, mandatory CI step, external report upload, or minimum mutation
score. Existing unit, integration, Storybook, and Playwright commands retain their behavior. Surviving mutants
are review candidates, not automatic production defects or merge blockers.

## What the tests exercise

The selected range contains only `resolveClinicDashboardRouteAccess`. Personal notification access is outside
the mutation scope, even though its existing test shares the unit test file.

The unit cases exercise both the controlled and normal server branches with simulated access and session
results. They cover independent view and edit rights, foreign and missing clinic targets, path-based targets,
explicit target precedence, empty clinic sets, selection from several clinics, denial and availability states,
missing sessions, returned identity and credentials, and response adaptation.

The integration cases call the profile read action through the real route access resolver, access resolver,
session reader, bootstrap parser, and response adapter. Only the Supabase SDK factory, HTTP transport, and
profile data provider are simulated. These cases verify an authorized clinic read, foreign-clinic denial,
missing read rights, an invalid session, and upstream denial or unavailability. Denial must occur before the
profile provider is created or called.

All identities, tokens, origins, and returned clinic data are synthetic. These tests do not verify deployed
Supabase or Payload services. Payload remains the authority for clinic assignments and permissions.

## Pilot evidence

The original run exposed a missing negative-path test for an API prefix nested below an unrelated route. The new test
requires denial in both execution modes. The original run, corrected run, and literal filename checks are recorded in
[PR #297](https://github.com/findmydoc-platform/clinic-dashboard/pull/297) and the
[pinned pilot report](https://github.com/findmydoc-platform/clinic-dashboard/blob/378d79fa0e2672a9b794279daa0b19f70a5b34f8/docs/testing/clinic-access-mutation-testing.md#pilot-results).
