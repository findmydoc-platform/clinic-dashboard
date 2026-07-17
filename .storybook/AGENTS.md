# Storybook Configuration Rules

- Keep global providers, theme setup, Autodocs, viewports, sorting, and Controls configuration central.
- Preserve fail-closed accessibility with `a11y.test: "error"`; fix warnings instead of suppressing them.
- Colocate component stories; keep cross-feature journeys only under `src/features/clinic-dashboard/journeys`.
- Title journey stories under `Clinic Dashboard/Journeys/Pages`.
- Follow `docs/engineering/frontend-architecture.md` for titles, tags, and test ownership.
