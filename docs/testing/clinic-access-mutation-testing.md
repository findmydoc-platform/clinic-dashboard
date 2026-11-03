# Focused clinic access mutation testing

This pilot implements [issue #105](https://github.com/findmydoc-platform/clinic-dashboard/issues/105).
It checks whether tests detect changes to clinic selection, operation capabilities, and session requirements
in `resolveClinicDashboardRouteAccess`.

## Running a focused check

Use Node 24 and pnpm 10. Run `pnpm install --frozen-lockfile` after checking out this branch.
StrykerJS core and its Vitest runner are pinned to `10.1.1` as development dependencies.

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
Each completed mutation run replaces these reports. The pilot's first completed reports were retained locally
as `coverage/mutation/initial.html` and `coverage/mutation/initial.json` before the second run.

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

## Pilot results

The pilot ran on 2026-10-28 on local branch `feature/105-clinic-access-mutation-test`, based on
`74657b58506b45337c41d32f76bce6238b643530`. The production source is unchanged from that base. The final
tests and command are recorded in the same commit as this report.

Environment: Node `24.22.1`, pnpm `10.28.2`, Vitest `4.1.12`, StrykerJS `10.1.1`, TypeScript `5.9.3`.
Both completed mutation runs used the exact file range and test selections now recorded in the checked-in
`test:mutation:clinic-access` script.

| Run                                     | Baseline tests | Mutants | Killed | Survived | No coverage | Timeouts | Mutant errors | Score  | Duration |
| --------------------------------------- | -------------- | ------- | ------ | -------- | ----------- | -------- | ------------- | ------ | -------- |
| Initial                                 | 37 passed      | 58      | 57     | 1        | 0           | 0        | 0             | 98.28% | 5 s      |
| After the additional negative path test | 39 passed      | 58      | 58     | 0        | 0           | 0        | 0             | 100%   | 5 s      |

Durations are Stryker's reported whole-run durations, including the baseline test execution. The separate
successful setup-only run executed 37 tests before the first complete run.

One preliminary setup-only attempt failed before test execution because automatic plugin discovery did not
find the Vitest runner under pnpm. Explicit plugin registration fixed the setup. This attempt produced no
completed mutation result. Both complete runs had zero runtime or compilation errors and zero timeouts.

## Review of the surviving mutation

The initial run had one survivor, mutant `3`, at `route-access.ts:32`, columns 5 through 62. Stryker removed
the start anchor from the clinic-path regular expression:

```ts
// Original
/^\/api\/dashboard\/clinics\/([A-Za-z0-9._~-]{1,100})\//u

// Mutation
/\/api\/dashboard\/clinics\/([A-Za-z0-9._~-]{1,100})\//u
```

The existing tests checked valid clinic paths and a targetless legacy path, but none checked a nested path
containing the clinic API prefix. With the mutation active, a path such as
`/unrelated/api/dashboard/clinics/clinic-1/profile` could supply a clinic target without starting at the
clinic API boundary.

This was a test gap, not a defect in the original implementation. The new test,
`does not infer a clinic target from a nested path outside the clinic API`, requires denial for that path
in both execution modes. It passes on the unchanged source and kills the previously surviving mutation.
The second complete run has no remaining surviving or uncovered mutants.

The observed benefit is one additional negative-path scenario, exercised in two modes, beyond the planned
normal-server and integration coverage. No production bug reduction or broad authorization guarantee can
be inferred from the 100% score. It applies only to these 58 generated mutations in this function. Session
refresh policy, CSRF, personal notifications, and Website authorization require their own checks.

## Literal filename validation

On 2026-10-29, CLI regression tests verified dynamic `[clinicId]` segments, `(workspace)` route groups,
optional catch-all segments, ordinary source paths, line ranges, and literal test filenames. The tests execute
the actual CLI with an engine stub and check the resulting selection using the pinned Stryker file matcher.
Five cases failed before the correction; all six pass with literal filename encoding.

An actual Stryker setup-only run selected the existing dynamic route below and its specified range, then
completed its six baseline tests:

```sh
pnpm test:mutation \
  --mutate 'src/app/api/dashboard/clinics/[clinicId]/profile/route.ts:1-8' \
  --testFiles tests/integration/clinic-route-access.test.ts \
  --dryRunOnly
```

This setup check validates filename and range handling. It does not establish mutation coverage of that
route wrapper. The original clinic-access mutation command remains the completed behavioral pilot.
After the filename correction, that original command was also repeated successfully: 39 baseline tests,
58 killed mutants, zero survivors, uncovered mutants, timeouts, or mutant errors, in 6 seconds.
