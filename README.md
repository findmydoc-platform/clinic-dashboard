# findmydoc Clinic Dashboard

The Dashboard owns the clinic staff interface, server-side sessions, and the Backend for Frontend. Start with the [architecture](ARCHITECTURE.md) for the request path, owner contracts, and links to shared platform architecture.

## Local Development

1. Use Node 24 and pnpm 10.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` and provide the Staging Supabase, preview Payload, origin, and CSRF values.
4. Start the application with `pnpm dev`.
5. Open `http://localhost:3000`.

See the [environment contract](docs/authentication-and-bff.md#environment-contract) for environment pairing and [deployment setup](docs/SETUP.md) for Preview origins and Supabase redirect configuration.

## Validation

Run `pnpm check` for code, scripts, dependencies, hooks, or technical configuration changes.

`pnpm typecheck` uses the project compiler pinned in [package.json](package.json). Tools that require the JavaScript compiler API use the `typescript-legacy` alias. See [.pnpmfile.cjs](.pnpmfile.cjs) for the compatibility overrides. Keep [pnpm-lock.yaml](pnpm-lock.yaml) with dependency changes.

Select additional tests according to the affected behavior and risk, following the [test-strategy skill](.codex/skills/test-strategy/SKILL.md) and the frontend architecture's [Test Ownership section](docs/engineering/frontend-architecture.md#test-ownership).

Run `pnpm test:mutation:clinic-access` for the [focused clinic access mutation check](docs/testing/clinic-access-mutation-testing.md). Its production-code range and test selection are defined in `package.json`.

The proposed [shared mutation testing decision](https://github.com/findmydoc-platform/platform-architecture/blob/cdf782c2d654241529b6bc20ecb5493787d2dbbf/decisions/037-adr-focused-mutation-testing.md) records the platform-wide criteria and remains Draft (GitHub access required).

Changes to rendered UI, component interaction, or Storybook behavior require relevant Storybook browser checks and a Storybook build. Run `pnpm build` when a change can affect application output.

CI selects work before installing application dependencies. Documentation changes run `pnpm docs:check`, PR metadata
checks, and a changed-file secret scan. Existing test-case changes run static checks and selected tests. Shared test
support, structural test changes, and unknown paths receive full validation. See [CI path routing](docs/engineering/ci-path-routing.md)
for the routing matrix, failure policy, and CodeQL cutover.

## Delivery

The public repository requires `Quality`, `Workflow Security`, `Semantic PR title`, `Linked issue`, `Dependency Review`,
and `Vercel Preview`, plus the configured code-scanning and code-quality rules. Required checks retain their names and
report valid skip results when work is unnecessary. Documentation and test-only changes do not deploy a Preview.
Deploy-relevant PRs receive temporary Preview deployments, and deploy-relevant merges update the stable Main Preview.
Manual Main Preview runs force a deployment. Production deployments run only through the central platform release.
The component deployment workflow accepts only the platform release GitHub App as both dispatcher and rerun actor.

See [deployment setup](docs/SETUP.md) for GitHub and Vercel settings and domain verification.
