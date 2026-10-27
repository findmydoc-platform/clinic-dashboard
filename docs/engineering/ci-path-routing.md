# CI path routing

CI and Preview use the same dependency-free Node classifier before installing application packages. Required check
names remain stable even when their expensive steps or deployment jobs are skipped. The Dashboard owns no database
migrations, so this policy includes no database validation.

## Routing

| Changed paths                                                                         | Validation                                                                         | Preview                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- |
| Markdown and documentation assets                                                     | Changed Markdown formatting and local links, PR metadata, changed-file secret scan | Skip                                          |
| Existing unit or integration cases                                                    | Static checks and selected cases                                                   | Skip                                          |
| Existing stories                                                                      | Static checks, selected browser stories, Storybook build                           | Skip                                          |
| Existing controlled E2E cases                                                         | Static checks and selected Chromium cases                                          | Skip                                          |
| Added, removed, or renamed cases; shared fixtures, helpers, setup, test configuration | Full existing validation                                                           | Skip unless deploy-relevant paths also change |
| Runtime, public assets, application configuration, dependency files                   | Full validation                                                                    | Deploy                                        |
| Workflow files and local actions                                                      | Static checks, CI contract tests, actionlint, zizmor, Actions CodeQL               | Deploy only for deployment or routing changes |
| Classifier, shared scope action, CI workflow, or CI execution scripts                 | Full validation and workflow audits                                                | Deploy                                        |
| Unknown paths or incomplete detection                                                 | Full validation and conservative security checks                                   | Deploy                                        |

Mixed changes combine requirements. Dependency review runs for package manifests, supported lockfiles, workspace
manifests, and Dockerfiles. Public Markdown is deploy-relevant. Markdown referenced by runtime source is also treated
as application input. An existing filename alone does not permit selected tests: the change must be a modification,
and it must not belong to shared test support.

Cross-application E2E files retain the existing separate lane. Changing them selects full normal validation, including
controlled smoke tests, without starting the Website or a database. Their cross-application verification remains a
separate explicit run.

## Detection and failure policy

Pull requests use paginated GitHub file lists and compare their file count and head/base revisions with the event.
Pushes compare the entire `before` and `after` commits. Renames include both the previous and current filename.
Unavailable comparisons, unsupported statuses, duplicate paths, incomplete pagination, and API failures require full
work. Changes are passed as JSON and process argument arrays, never interpolated into executable shell commands.

`Quality`, `Workflow Security`, `Semantic PR title`, `Linked issue`, `Dependency Review`, and `Vercel Preview` remain
the required check names. Required workflows do not use workflow-wide path filters. The classification summary lists
required and skipped work with a reason. A failed scope job cannot turn a relevant deployment or CodeQL analysis into
a successful skip.

`docs:check` uses the exact Prettier version from `package.json` in an isolated invocation, without installing the app.
It checks links in changed Markdown and incoming links to removed Markdown. Ordinary app changes retain the full
repository formatting check. The secret scanner examines existing changed files; scanner or baseline changes,
scheduled runs, manual runs, and detection failures scan all tracked files. Deleted files are not passed to the scanner.

## CodeQL cutover

The repository currently uses GitHub Default Setup. The new workflow is gated by `CODEQL_ADVANCED_ENABLED=true` so it
can merge while Default Setup still protects the repository. Keep the CodeQL ruleset tool and severity thresholds.

After the workflow reaches `main`:

1. Read and retain the current Default Setup configuration for rollback. Confirm the new workflow is available.
2. Disable Default Setup, set `CODEQL_ADVANCED_ENABLED=true`, and manually run the CodeQL workflow on `main`.
3. Confirm both `javascript-typescript` and `actions` analyses succeed and upload results.
4. Validate a Markdown-only PR, including every required status and the separate code-scanning merge rule. Both
   analysis jobs must skip. Then verify that merging documentation skips Main Preview and application work.
5. If analysis upload or merge-rule compatibility fails, disable the advanced workflow variable and restore Default
   Setup with its recorded configuration. Keep the existing protection thresholds.

The weekly Monday scan and manual CodeQL runs analyze both languages fully. JavaScript/TypeScript changes and
dependency changes select JavaScript analysis; workflow and local-action changes select Actions analysis. Unknown
inputs select both. Default Setup must be disabled before advanced results can be uploaded.

## Validation and timing

Run `pnpm check` and the focused CI routing, documentation, workflow, and deployment contract tests. Run actionlint
and zizmor for workflow changes. Test production classification with nested Markdown, each test class, support files,
dependencies, workflows, mixed paths, deletes, renames, incomplete API pagination, and missing Git comparison commits.

For a completed comparison, pass every workflow run ID for one event, including CodeQL:

```sh
pnpm ci:timings <run-id> <run-id>
```

The report separates elapsed time from first run creation to final job completion and summed job durations. The
latter measures runner workload, not billable minutes. Include skipped jobs and record retry attempts. The baseline
for PR #278 is 600 seconds elapsed and 829 summed job-seconds, including CodeQL. A reduction is only claimed
after a real documentation PR and Main push have been observed.
