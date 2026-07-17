# ADR 0002: Feature-First Atomic Frontend Architecture

- Status: Accepted
- Date: 2026-07-16
- Decision owners: Product and frontend engineering
- Migration plan: [Frontend Architecture, Storybook, and AI Drift Reduction Plan](../plans/frontend-architecture-storybook-and-ai-drift.md)
- Implementation authority: [Frontend Architecture](../engineering/frontend-architecture.md)

## Context

The Clinic Dashboard started as a rescued, fixture-backed visual foundation. Its first implementation grouped business components globally under `atoms`, `molecules`, `organisms`, and `templates`. As the prototype gained messaging, reviews, clinic-profile editing, support, local mutations, responsive behavior, and Storybook interactions, those folders stopped expressing ownership.

The historical baseline at `d1a39bd0` contained a 550-line application controller, a 224-line template that read prototype data and capability policy, a 481-line cross-domain prototype object, and an 816-line application story. Hooks, providers, policies, browser adapters, and domain workflows were also classified as Atomic components even though Atomic Design does not describe those responsibilities. These measurements are decision evidence for the pre-migration snapshot, not current architecture findings.

The project needs a structure that remains understandable when the approved Payload boundary is introduced later, without implementing that boundary now.

## Decision

The frontend uses feature ownership first and Atomic Design inside that ownership boundary.

1. Clinic Dashboard business UI lives under `src/features/clinic-dashboard/<area>`.
2. The initial areas are `workspace`, `dashboard`, `messages`, `reviews`, `clinic-profile`, `support`, and `prototype`.
3. Visual feature components may use local `atoms`, `molecules`, and `organisms` folders. Non-visual code never receives an Atomic layer.
4. `src/components/ui` remains the flat shadcn registry and contains only domain-neutral UI primitives and compound controls. Its Atomic classification lives in component contracts and Storybook metadata rather than a second physical hierarchy. `src/components/brand` contains canonical brand rendering. Providers live under `src/providers`.
5. `ClinicDashboardWorkspace` is the single application composition root. It owns only cross-feature navigation, prototype mode, global notifications, and overlay routing.
6. Each stateful business area owns its controller and the reducers, selectors, view models, or command contracts its current behavior requires.
7. `ClinicDashboardShell` is domain-dumb. It renders app chrome, navigation, slots, and transient drawer/focus mechanics without reading business data, capability policy, or browser storage.
8. Runtime prototype data is distinct from Storybook/test fixtures, stays private and feature-local, and is mapped into stable view models before screen rendering. General `public.ts` contracts never re-export it.
9. Storybook navigation is business-area first and Atomic layer second. Direct component stories are colocated; cross-feature journeys are intentionally few.
10. Architecture, Storybook governance, AI instruction quality, and dead-code checks remain separate strict deterministic gates without baselines or exemptions.

## Dependency Direction

The allowed direction is:

```text
Next.js route
  -> workspace composition
     -> feature public contracts
        -> feature controllers and view models
           -> feature visual components
              -> shared UI
```

Pure models do not import React, Next.js, components, DOM APIs, or browser storage. Shared UI does not import features. Feature components do not import prototype data, test fixtures, or browser adapters. Only `ClinicDashboardWorkspace` may use the narrow private composition imports for feature-local prototype data, explicitly named prototype-data mappers, runtime prototype commands, and `PrototypeModeSwitch`.

## Consequences

### Positive

- Business ownership is visible in paths, imports, stories, and tests.
- Screens become independently renderable and testable from view models.
- Prototype data and a later approved API adapter can share stable feature-input and mapping boundaries.
- Business transitions move out of JSX into focused unit-testable modules.
- Storybook becomes searchable by the language contributors use when discussing the product.
- Mechanical checks reject every architecture or Storybook governance finding and keep AI instruction and dead-code ownership separate.

### Costs

- The migration changed many internal paths and story titles.
- Independently owned responsibilities require more focused files.
- Redistributing application-level interaction tests required explicit behavior mapping before the monolithic story was deleted.
- Strict checker behavior requires focused process-fixture tests for accepted and rejected dependency graphs.

## Alternatives Rejected

### Keep global Atomic folders

Rejected because `organisms` and `molecules` no longer identify a business owner and have become catch-all locations for controllers, providers, dialogs, and workflows.

### Organize only by technical type

Rejected because global `components`, `hooks`, `models`, and `services` would still separate code that changes together and encourage generic abstractions.

### Introduce a generic shared or service layer first

Rejected because the project has one bounded context and no approved persistent data integration. Shared code must be proven domain-neutral; external services must exist before an adapter is created.

### Rewrite the interface

Rejected because the current UI and its 20 merged interaction corrections are the behavioral baseline. The migration preserves output and moves one vertical slice at a time.

## Scope Boundary

This decision does not add clinic data, Supabase authentication, Payload access, durable storage, routes, capabilities, or deployment changes. Production delivery is active in the project profile, but its configuration is outside this architecture migration.
