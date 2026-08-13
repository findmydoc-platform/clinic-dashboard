# Frontend Architecture

This document is the implementation authority for Clinic Dashboard frontend structure. [ADR 0002](../adr/0002-feature-first-atomic-architecture.md) owns feature-first UI structure, [ADR 0003](../adr/0003-domain-data-provider-composition.md) owns live-domain provider composition, and their implementation plans own migration order.

## Core Rules

1. Business ownership comes before Atomic classification.
2. Atomic Design applies only to visual component composition.
3. Shared UI is domain-neutral and intentionally narrow.
4. Routes compose public feature entries; they do not reach into feature internals.
5. The workspace owns cross-feature orchestration only. Stateful business areas own their own controllers.
6. Shells and screens do not read runtime demo sources, fixtures, capability policy, or browser storage.
7. Models are pure TypeScript. Hooks own React lifecycle behavior. Adapters own external side effects.
8. Runtime demo data and Storybook/test fixtures are different source categories.
9. Storybook hierarchy is business-area first and Atomic layer second.
10. A destination feature owns its semantic focus and entry-target contracts; callers depend on that public type, never the reverse.
11. Every source file must satisfy architecture and story governance. There are no baselines or exemptions.
12. Every approved live business domain owns a private server-only provider contract; one central composition selects its Controlled or Payload implementation.

## Target Structure

Create a folder only when its first concrete responsibility is migrated.

```text
src/
  app/
    page.tsx

  components/
    ui/
      <domain-neutral-control>.tsx
    brand/
      BrandMark.tsx

  providers/
    ThemeProvider.tsx

  features/
    clinic-dashboard/
      data-provider-composition.ts
      public.ts
      server.ts
      workspace-provider.ts

      demo/
        commands.ts
        dataset.ts
        loader.ts
        notifications.ts
        organization.ts
        profile-projection.ts
        reporting.ts
        assets/
          locations/
          people/
        locations/
          <location-id>/
            dashboard.ts
            messages.ts
            profile.ts
            reviews.ts

      workspace/
        ClinicDashboardWorkspace.tsx
        ClinicDashboardShell.tsx
        useClinicDashboardController.ts
        browser-session.ts
        components/
          molecules/
            ClinicDashboardNavigation.tsx
        model/
          profile-save-projection.ts
          workspace-input.ts

      prototype/
        components/
          molecules/
            PrototypeModeSwitch.tsx
        demo-interaction-policy.ts
        prototype-mode.ts

      dashboard/
        public.ts
        dashboard-view-model.mapper.ts
        components/
          molecules/
          organisms/
        hooks/
          useDashboardController.ts
        model/
        testing/

      messages/
        public.ts
        Messages.tsx
        InquiryQueueController.tsx
        browser/
          inquiry-status-api.ts
        components/
          molecules/
            ConversationActionsMenu.tsx
            ConversationListItem.tsx
            InquiryListItem.tsx
            InquiryStatusMenu.tsx
            MessageComposer.tsx
          organisms/
            InquiryQueueScreen.tsx
            MessagesScreen.tsx
            PatientInquiryProfileDialog.tsx
        hooks/
          useInquiryQueueController.ts
          useMessagesController.ts
        model/
          inquiries.ts
          inquiry-queue.reducer.ts
          inquiry-queue.selectors.ts
          inquiry-status-commands.ts
          message-commands.ts
          messages.ts
          messages.reducer.ts
          messages.selectors.ts
        server/
          actions.ts
          controlled-inquiries.ts
          patient-inquiry-provider.ts
          payload-inquiries.ts
          public.ts
        testing/
          messages.fixtures.ts

      reviews/
        public.ts
        Reviews.tsx
        browser/
          review-source-api.ts
        components/
          molecules/
          organisms/
            ReviewAppealDialog.tsx
            ReviewHistoryDialog.tsx
            ReviewResponseDialog.tsx
        hooks/
          useReviewsController.ts
        model/
          review-source.ts
          review-source-commands.ts
          review-source-schema.ts
        server/
          actions.ts
          controlled-reviews.ts
          payload-reviews.ts
          review-provider.ts
        testing/

      clinic-profile/
        public.ts
        ClinicProfile.tsx
        components/
          molecules/
          organisms/
        hooks/
          useClinicProfileController.ts
        model/
        testing/

      support/
        public.ts
        components/
          organisms/
        hooks/
        model/
        testing/

      journeys/
        FoundationPreview.stories.tsx

  storybook/
    StorybookTheme.tsx
    viewports.ts
```

Do not create generic `shared`, `common`, `misc`, `helpers`, `services`, or `repositories` folders. Domain-neutral UI already has an owner under `components`; future external capabilities receive a named adapter only when approved.

## Import Matrix

| Source                         | May import                                                                                                                              | Must not import                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `app/**`                       | providers, `features/clinic-dashboard/public.ts`, root `server.ts`, and the exact auth `server/public.ts` entry for auth/session routes | other feature internals, provider implementations, demo-source details, fixtures                      |
| Server entry                   | central data-provider composition, private workspace provider, workspace input, demo loader, and inquiry server contract                | concrete domain providers, components, browser adapters, demo client commands, fixtures               |
| Data-provider composition      | environment contract, domain provider contracts, and concrete Controlled/Payload providers                                              | components, browser adapters, route implementations, fixtures                                         |
| Domain provider contract       | same-domain serializable models                                                                                                         | React, Next.js UI, routes, browser adapters, Storybook                                                |
| Domain provider implementation | its domain contract, transport validation, domain models, and server environment                                                        | UI, routes, browser adapters, Storybook                                                               |
| Workspace provider             | the private workspace input type                                                                                                        | live-domain contracts, components, browser adapters, runtime client commands, fixtures                |
| Demo source                    | other `demo/**` modules, sibling `public.ts` contracts, and named private workspace input, validation, and projection contracts         | app routes, components, Storybook, tests, browser storage                                             |
| Workspace                      | feature `public.ts` contracts, demo client adapter at the client entry, workspace model, shared UI                                      | raw demo data, other private feature leaf components, test fixtures, live-domain providers            |
| Feature components             | same-feature public model types, same-feature lower visual layers, shared UI                                                            | runtime demo data or commands, fixtures, browser adapters, server providers, sibling internals        |
| Feature hooks                  | React, same-feature model, named command contracts/adapters                                                                             | runtime demo data or commands, unrelated feature internals, test fixtures, route or server code       |
| Feature model                  | TypeScript-only types and pure functions                                                                                                | React, Next.js, components, hooks, providers, DOM, storage                                            |
| Browser command implementation | same-origin capability routes and serializable model types                                                                              | server provider contracts or implementations, React components, Storybook                             |
| `components/ui/**`             | React, Radix/shadcn dependencies, design tokens, domain-neutral utilities                                                               | app, features, domain models, runtime demo sources, fixtures                                          |
| React providers                | provider libraries and domain-neutral configuration                                                                                     | Clinic Dashboard feature behavior                                                                     |
| Stories/testing                | public components, public contracts, independent fixtures and command fakes, Storybook/test APIs                                        | runtime demo data or commands; server providers except exact contract, adapter, and composition tests |

Each feature area exposes a small `public.ts` with explicit named exports. General `public.ts` contracts never export runtime demo data, provider implementations, or command implementations, and `export *` is forbidden. Sibling features use these contracts rather than importing another feature's internals. The server provider/loader, central data-provider composition, private live-domain contracts, and client demo-adapter entries are the narrow private exceptions described below; they are not public API.

## Composition Roles

### Workspace

`ClinicDashboardWorkspace` is the product-facing composition root. It may own:

- active business section;
- an internal QA-only prototype-mode override when explicitly enabled by Storybook;
- global notification read state;
- global overlay routing and cross-feature focus requests;
- selecting one serializable location snapshot from the server-provided workspace input.

It must not own review filters/mutations, the clinic-profile draft, inquiry search/status state, message search/draft state, or support-form state. Those belong to feature controllers.

Section navigation must preserve user-authored state that has not been persisted. Stateful feature facades may therefore remain mounted inside a native `hidden` container while another section is active; the attribute removes their content from layout and the accessibility tree without moving ownership into the workspace. A location change is the explicit exception: location-scoped facades remount from the selected deterministic snapshot, while navigation, reporting period, selected funnel metric, and interface mode remain stable. Revisit this choice when a server-backed cache or route-level state becomes the approved owner.

### Controller

A controller is a named React hook or a thin component that connects state, commands, effects, and a view model. Examples include `useReviewsController` and `useClinicProfileController`.

Controllers may use React state, reducers where related transitions need one, effects, and named command contracts. They return semantic models and actions. They do not render large JSX trees.

### Shell

`ClinicDashboardShell` renders app chrome, navigation, header utilities, responsive layout, and content slots.

A domain-dumb shell may own transient drawer visibility and its local focus restoration. It must not select data, evaluate capabilities, write storage, or own business state.

### Screen

A Screen is the complete business-area content rendered inside the workspace shell. In this application a Screen is an Atomic organism because it is one distinct interface section within a larger workspace template.

Screens receive immutable view models and semantic actions. They do not import a data source, command implementation, runtime demo data, or fixture.

### View

Use `View` only for a true props-only rendering partner to a controller when `Screen` is not accurate. Do not suffix every component with `View`.

## Atomic Classification

| Layer    | Definition                                                             | Examples                                              |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Atom     | Smallest domain-neutral visual/control unit                            | Button, Input, Avatar, RatingStars                    |
| Molecule | Focused combination that performs one coherent UI task                 | Field, MetricCard, ConversationListItem               |
| Organism | Distinct interface section with a recognizable product responsibility  | NotificationCenter, ConversationList, DashboardScreen |
| Template | Workspace/page layout and content slots without concrete business data | ClinicDashboardShell                                  |
| Page     | Concrete template instance with realistic content                      | ClinicDashboardWorkspace, Next.js page, journey story |

Interaction, local state, file length, and import count do not determine the layer. Hooks, models, reducers, selectors, adapters, providers, runtime demo data, and fixtures have no Atomic layer.

Feature components use physical Atomic folders when more than one layer exists. Shared shadcn UI stays flat under `components/ui` so registry generation and imports remain canonical; its stories still declare `layer:atom` or `layer:molecule`.

React components outside Atomic folders are limited to explicitly classified controller facades, composition roots, Templates, Pages, and test-only harnesses. Visual implementation components belong under `components/atoms`, `components/molecules`, or `components/organisms`; arbitrary feature subdirectories are not an alternative component layer. Storybook governance checks exported visual components across the complete feature tree so moving a file into a nested folder cannot silently bypass the contract.

Production model and hook sources stay JSX-free and use `.ts`; `.tsx` is reserved for visual components and test-only stories or harnesses.

If the table cannot classify a file, clarify its responsibility. Do not invent another layer.

## Terminology

| Term                    | Meaning                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Model                   | Domain types and invariants independent of React                                                             |
| View model              | Immutable render-ready data without prototype or transport shape leakage                                     |
| Reducer                 | Pure state transition function with event-named actions                                                      |
| Selector                | Pure derivation from state/model inputs                                                                      |
| Mapper                  | Pure conversion between external/prototype and stable internal shapes                                        |
| Hook                    | Reusable React state or lifecycle behavior                                                                   |
| Commands                | Small business-area contract for async mutations, such as `ReviewCommands`                                   |
| Adapter                 | Named boundary to a browser or future external capability                                                    |
| Domain provider         | Private server-only contract that combines meaningful reads and writes for one approved live business domain |
| Demo interaction policy | Presentation behavior derived from the internal prototype mode; unrelated to live authorization capabilities |
| Prototype mode          | Internal `visual-reference` or external-demo `presentation` behavior                                         |
| Prototype data          | Deterministic runtime input for the current foundation preview                                               |
| Fixture                 | Story/test-only deterministic input                                                                          |

Avoid `Manager`, `Utils`, `Helpers`, `Common`, `Misc`, `Primitives`, `Data`, and `App` when a specific product or technical responsibility can be named.

Feature mutation boundaries are `ClinicProfileCommands`, `ReviewCommands`, `MessageCommands`, and `InquiryStatusCommands`. The demo client adapter implements the first three with transient local outcomes. `InquiryStatusCommands` uses the approved Dashboard BFF route. The route receives an injected `PatientInquiryProvider` factory from the root server composition and delegates the complete status operation; the browser never receives Payload credentials or private transport details. Each successful transition appends a session-local system event while the provider result supplies the authoritative status. `ClinicDashboardDemoInteractionPolicy` controls only which demo interactions are available in the presentation. It must never represent or replace Payload authorization capabilities such as `clinic-profile:view` and `clinic-profile:edit`. Support request state deliberately remains local-only while no approved external support capability exists. A future named support adapter and command contract require separate approval and are not preimplemented.

## Component API Rules

- One public React component per file and named exports.
- Props are colocated and read-only; export a props type only when production code consumes it.
- Destructure props at the component boundary.
- Domain state is controlled by one owner.
- Shared technical controls use `value/onValueChange`, `open/onOpenChange`, and `checked/onCheckedChange`.
- Domain callbacks describe intent: `onConversationSelect`, `onReviewResponseSubmit`, `onTreatmentRemove`.
- True booleans use `is*`, `has*`, `can*`, or `show*`.
- Mutually exclusive states use discriminated unions.
- Layout composition uses slots or `children` instead of special-case render booleans.
- Props crossing a Server/Client Component boundary are serializable.

At a screen boundary, cohesive `model` and `actions` objects are allowed:

```ts
type ReviewsScreenProps = Readonly<{
  model: ReviewsViewModel
  actions: ReviewsActions
}>
```

Leaf components receive the smallest named props they use rather than the complete screen model.

Do not pass React state setters, the complete prototype object, the cross-domain command source, DOM elements, or generic `onAction` callbacks through domain UI. Do not expose both controlled and uncontrolled business state. Avoid broad prop spreading and wildcard barrels.

More than roughly ten props, multiple state owners, or multiple business workflows is a review signal, not a hard numeric limit.

## State, Logic, and Effects

- Each fact has one owner.
- Derived values use selectors rather than duplicate state.
- Selection stores an ID, not a second entity snapshot.
- Related transitions use a reducer when separate state setters can produce invalid combinations.
- Pure rules and calculations stay outside hooks and JSX.
- A custom hook is for React lifecycle/state behavior, not a generic extraction mechanism.

Effects are limited to real external synchronization or DOM accessibility behavior:

- notification read-state persistence in `sessionStorage`;
- focus movement/restoration and status announcements;
- shared overlay interaction;
- future approved subscriptions.

Filtering, counting, capability evaluation, report selection, prop synchronization, and view-model mapping are render-time pure calculations.

Extract a named pure module when logic expresses a business rule, performs a transition, maps a shape, has meaningful edge cases, is reused, or calculates deterministic geometry/serialization. Keep one-use presentation helpers local. Never create a generic helper file only to shorten a component.

## Demo Data and Commands

`demo/**` is the single private runtime demo source. `dataset.ts` assembles organization-wide data and location snapshots; `loader.ts` is its server-only entry; location files own dashboard, profile, messages, inquiry, and review values; generated images stay under `demo/assets`. No `public.ts` exports the raw source.

`ClinicDashboardWorkspaceInput` is a private, provisional, serializable contract. It does not identify its technical source. `ClinicDashboardWorkspaceProvider` is the private server-side `loadWorkspace()` boundary for the remaining fixture-backed workspace; it does not own live business domains. `src/features/clinic-dashboard/server.ts` loads that workspace, resolves the verified session token, and asks the centrally composed live-domain providers for the clinic-scoped doctor directory and inquiry queue. Provider failures fail visibly in their owning area and never silently fall back to demo records. The App Router page passes the assembled serializable data to the interactive workspace.

`ClinicDashboardDataProviders` is a static server-only map with one explicit key per approved live domain. The central composition is the only production module that imports its concrete Controlled and Payload implementations or selects between them. The `doctors`, `inquiries`, `reviews`, and `treatments` providers bind the session access token request-locally. Doctor and treatment reads and writes are also scoped to the clinic ID from the authorized bootstrap; review access is enforced by the website contract for that same authenticated clinic. Browser input never chooses the clinic. Controlled implementations return deterministic synthetic data. Stateful Controlled providers preserve mutations across request-scoped composition in process-local test state and expose explicit test reset boundaries; they reset on server restart and are impossible to select in Preview or Production. Payload implementations validate and minimize website-owned responses. [ADR 0003](../adr/0003-domain-data-provider-composition.md) defines the extension and security rules.

`*.fixtures.ts` is Storybook/test-only. Stories and tests own independent feature-local fixture values and command fakes; they never import `demo/**`. Dataset contract tests exercise the server loader rather than reaching into the raw source. Production code never imports fixtures.

Runtime demo command implementations remain client-side under `demo/commands.ts` because functions cannot cross the Server Component boundary. Only `ClinicDashboardWorkspace` imports the demo client adapter. Review and treatment commands use their source-backed browser adapters instead. Feature UI, screens, shells, and controllers receive narrow feature command contracts. Profile completion projection is a pure generic workspace rule configured by private demo rules; no feature component knows those values.

The only private cross-area exceptions are: `server.ts` importing the central data-provider composition, demo workspace provider, workspace contract, and live-domain server contracts; the central composition importing exact live-domain contracts and concrete providers; exact provider contract and adapter tests importing those private modules; approved doctor, inquiry, and review BFF routes importing the root server entry; `demo/loader.ts` implementing the workspace provider; demo builders importing the private workspace input type; `ClinicDashboardWorkspace` importing the demo client adapter; and the existing `PrototypeModeSwitch` composition. All other cross-area imports use the owning area's `public.ts`.

Screens receive view models. Controllers receive the smallest command contract they need. The production page starts directly in the polished `presentation` mode and does not render a mode switch. `visual-reference` and the switch remain internal Storybook/QA tools. Only notification read IDs may survive in `sessionStorage`. Inquiry status and review workflows are persisted by website-owned Payload contracts in normal mode; Controlled mode keeps returned changes in browser state until reload. Timeline system events are intentionally session-local. Profile, message, and support demo changes reset on reload or location change. Further Payload integrations and Dashboard-owned persistence remain out of scope until separately planned.

Browser effects use narrow named adapters. Dashboard owns the aggregate profile-views CSV serializer and calls the domain-neutral `downloadTextFile` browser adapter. Reviews exposes no download or export capability.

## Storybook Contract

Stories are colocated beside their primary component. Cross-feature journey stories are the only exception and live under `src/features/clinic-dashboard/journeys`.

Titles use business ownership before Atomic layer:

```text
Shared/Atoms/Button
Shared/Molecules/Dialog
Clinic Dashboard/Workspace/Templates/Clinic Dashboard Shell
Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace
Clinic Dashboard/Dashboard/Molecules/Metric Card
Clinic Dashboard/Dashboard/Organisms/Dashboard Screen
Clinic Dashboard/Messages/Molecules/Conversation List Item
Clinic Dashboard/Reviews/Organisms/Reviews Screen
Clinic Dashboard/Clinic Profile/Organisms/Treatment Dialog
Clinic Dashboard/Support/Organisms/Support Request Dialog
Clinic Dashboard/Journeys/Pages/Foundation Preview
```

Every meta has `component` and exactly one tag from each group:

- domain: `shared`, `workspace`, `dashboard`, `messages`, `reviews`, `clinic-profile`, or `support`;
- layer: `atom`, `molecule`, `organism`, `template`, or `page`;
- status: `stable` or `prototype`.

Autodocs is applied globally for public components. Only stories colocated in the explicit `journeys` area may opt out. Component stories and every story export inherit fail-closed accessibility enforcement; they may not set `a11y.disable`, downgrade `a11y.test`, or remove Autodocs indirectly through spreads or mutations.

Shared public components, feature Screens, Shells, and exports from feature `public.ts` require direct stories. Private static implementation components may be covered through their owner story.

Use typed CSF, args, action spies, accessible queries, awaited interactions, and one coherent behavior per `play`. A controlled harness is allowed only when a story must update a controlled value. Retry/failure sources are created per story render; module-global mutable counters are forbidden.

Do not assert Tailwind/Lucide classes or internal state as behavior. Do not duplicate viewport objects, accessibility settings, providers, or theme initialization in stories.

Global Storybook configuration owns accessibility (`test: "error"`), providers, the theme toolbar, Autodocs, viewports, Controls defaults, and story sorting. The governed configuration contract requires `.storybook/main.ts` to keep the colocated `src` story glob and accessibility addon, and `.storybook/preview.ts` to keep global Autodocs and fail-closed accessibility tests. Both exported configuration objects stay statically analyzable and immutable: spreads, reassignments, and direct or aliased mutations are rejected. Story-specific layout belongs in story parameters when `centered` is not appropriate.

## Test Ownership

| Layer             | Owns                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Unit              | reducers, selectors, policies, serializers, mappers, validation, reporting, geometry                  |
| Storybook browser | component states, controlled behavior, keyboard/focus, dialogs, responsive screens, accessibility     |
| Playwright E2E    | temporary auth and a few real route/shell/cross-feature journeys                                      |
| Integration       | approved BFF authentication and inquiry-status route contracts when an external boundary is exercised |

Do not keep component interaction coverage in E2E when the isolated Storybook component can prove it. Do not replace behavior tests with snapshots alone.

## Mechanical Enforcement

- `pnpm architecture:check` owns import direction, source ownership, public-contract boundaries, and runtime-data separation.
- `pnpm stories:governance:check` owns story path, title, tags, metadata, and direct coverage.
- `pnpm ai:slop-check` owns instruction-source clarity and conflicts.
- `pnpm deadcode:check` owns unused source and exports.

The governance checks are strict: every finding fails, with no baseline or category for pre-existing findings. `tests/unit/architecture-policy-check.test.ts` creates temporary repository fixtures, executes the real architecture checker process, and asserts both accepted and rejected dependency graphs.

`pnpm check` combines linting, type checking, both governance checks, AI instruction checks, and dead-code checks. The pull-request `Quality` workflow runs formatting, `pnpm check`, unit tests, Storybook browser tests, Storybook and application builds, and the E2E smoke suite. A failure in any step fails that workflow; branch-protection policy is outside this architecture contract.
