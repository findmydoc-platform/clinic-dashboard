# Review Gate Routing

## Review phases

- `planning_reviewer` runs separately and early for plans, project-profile decisions, access boundaries, data decisions, or rollout decisions.
- Implementation reviewers run after validation, in parallel, with at most four roles: `logic_reviewer`, `security_reviewer`, `test_reviewer`, and `ui_reviewer`.

## Signals

| Surface                                                                                 | Reviewer            |
| --------------------------------------------------------------------------------------- | ------------------- |
| Plans, ADRs, project profile, access, data, migration, or rollout decisions             | `planning_reviewer` |
| Production TypeScript, server, controller, model, state, mapping, or API behavior       | `logic_reviewer`    |
| Auth, API, server, environment, workflow, dependency, persistence, or secret boundaries | `security_reviewer` |
| Production behavior, tests, test configuration, fixtures, or mocks                      | `test_reviewer`     |
| TSX, styles, stories, themes, branding, or visual assets                                | `ui_reviewer`       |

The router uses path and filename signals. Its temporary JSON recommendation is deterministic, but the main agent must state the reasons and may add a reviewer only when concrete diff evidence exposes a missed risk. Any added reviewer requires the same user approval.

## Evidence and execution

- The review target includes every change since the merge-base with the selected base: branch commits, index, worktree, renames, deletions, and untracked non-ignored files.
- Route output is current-task context only and is not stored.
- Existing green validation is passed directly to reviewers. Reviewers run only focused read-only reproductions needed for a finding.
- The UI reviewer starts with available Mobile, Light, Dark, and Storybook evidence. A browser run is reserved for missing, contradictory, or interaction-critical evidence.
- A reviewer failure or incomplete result blocks the gate unless retried or documented as an explicit exception.

## Finding consolidation

Each finding requires an owner, severity from 1 to 10, confidence, concrete evidence, impact, reproduction or logical proof, and a minimal recommendation. Exclude praise, style-only preferences, metric-only observations, and generic refactoring suggestions.

Merge duplicate symptoms under one root cause. Keep a test gap separate only when it has a distinct impact or action. Report the consolidated result directly to the user and copy only the compact status and decisions into the pull request.
