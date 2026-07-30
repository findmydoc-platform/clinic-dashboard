# ADR 0003: Domain Data Provider Composition

- Status: Accepted
- Date: 2026-07-27
- Decision owners: Product and platform engineering
- Implementation plan: [Dashboard Domain Provider Composition Plan](../plans/dashboard-domain-provider-composition.md)
- Implementation authority: [Frontend Architecture](../engineering/frontend-architecture.md)

## Context

The Clinic Dashboard combines one authenticated live domain with a fixture-backed workspace. Patient inquiries are read
from and changed through website-owned Payload endpoints, while the rest of the workspace still uses deterministic demo
data. Before this decision, the inquiry read path and mutation path selected their data source independently. The
server loader contained a controlled-mode exception, while the status handler called Payload-specific functions
directly.

That split made one business capability depend on two different composition rules. It also exposed the transport
sequence for a status change to the route-level handler and gave later live domains no enforced extension pattern.
Doctor management needs the same local-controlled and live-Payload split without turning the remaining workspace
fixture provider into a generic repository.

Patient inquiry content is private clinic data. Reads and writes require the verified server session, remain uncached,
and must not expose access tokens or raw Payload failures to the browser.

## Decision

The Dashboard composes live data providers by business domain at one server-only boundary.

1. `ClinicDashboardDataProviders` is a typed map with one explicit key per approved live domain. It starts with
   `inquiries`; it is not a runtime registry or plugin mechanism.
2. `PatientInquiryProvider` is a private server-only contract with `loadQueue()` and
   `changeStatus({ inquiryId, status })`.
3. `changeStatus` is a deep operation. The Payload implementation owns the current-record read, the shared transition
   check, and the write. The `GET -> validate -> PATCH` sequence is not part of the route contract.
4. Every provider operation returns a closed discriminated result. Read failures are `unauthorized`, `forbidden`, or
   `temporarily-unavailable`; changes may additionally return `not-found` or `conflict`.
5. `data-provider-composition.ts` is the only production module that imports concrete live-domain providers and selects
   between Controlled and Payload data.
6. `server.ts` remains the production composition root. It obtains the verified access token, creates the
   request-scoped provider map, loads the inquiry queue, and injects the inquiry-provider factory into the mutation
   handler.
7. The existing controlled authentication mode selects both authentication and live-domain data. No second
   environment switch is introduced. Environment validation rejects Controlled mode in Preview, Production, or a
   production Node environment.
8. Controlled data is deterministic and non-persistent. A successful browser mutation updates the current client
   state, while the next full page load receives the original controlled snapshot.
9. Payload failures never trigger a fallback to Controlled data.
10. The aggregate `ClinicDashboardWorkspaceProvider` remains responsible only for the fixture-backed workspace. It is
    not expanded into a provider for live domains.

## Security And Data Boundaries

- Provider creation happens only after session resolution supplies an access token.
- The token is bound to the request-scoped Payload provider and is never returned to Client Components.
- Payload requests reject redirects, use `no-store`, and accept only the configured environment origin.
- Provider adapters validate upstream shapes and map only purpose-specific inquiry fields.
- Route handlers retain same-origin, HMAC-CSRF, input-size, session, authorization, and private-cache enforcement.
- Provider failures are sanitized before they cross the same-origin BFF boundary.
- Tenant and permission enforcement remains website-owned. The Dashboard does not add a database, service-role
  credential, or browser-to-Payload path.

## Extension Pattern

An approved live domain adds:

1. one private server-only domain contract containing meaningful business operations;
2. one deterministic Controlled implementation and one Payload implementation;
3. one explicit key in `ClinicDashboardDataProviders`;
4. one central composition branch using the existing controlled mode;
5. a shared contract suite plus adapter, composition, integration, and relevant browser coverage.

The domain must not add a dynamic registration API, import concrete providers from UI or route modules, or broaden the
workspace provider.

## Consequences

### Positive

- Reads and writes for one domain use the same source-selection rule.
- Route handlers depend on business operations rather than Payload request sequences.
- Controlled and Payload behavior share one contract and can be tested with the same acceptance cases.
- Provider errors are exhaustive and transport details stay inside the adapter.
- Later live domains have an explicit, enforced pattern without a generic repository layer.

### Costs

- Each live domain requires a small contract, two implementations, composition wiring, and contract tests.
- The root server entry performs explicit provider-factory injection for mutation handlers.
- The architecture checker needs exact allowlists and process fixtures for the private server boundaries.

## Alternatives Rejected

### Keep independent read and write source selection

Rejected because one domain could read Controlled data and write Payload data, or evolve different environment and
error behavior across the two paths.

### Expand the workspace provider

Rejected because the workspace contract is an aggregate fixture input. Adding live mutations and transport errors
would mix unrelated domains, preserve the temporary workspace shape as infrastructure, and encourage a broad
repository interface.

### Introduce a generic repository or plugin registry

Rejected because domains have different business operations and error contracts. Runtime registration adds
indirection without an approved extension use case.

### Let Route Handlers call Payload adapters directly

Rejected because it exposes multi-step transport behavior and transition policy at the HTTP boundary, and creates a
backward dependency from the composition root to route implementation.

### Fall back to Controlled data when Payload fails

Rejected because synthetic clinic data could be mistaken for current private data and could allow browser state to
diverge from the authoritative website system.

## Scope Boundary

This decision does not change the UI, browser command, same-origin status route, Payload schema, website collection,
database, tenant model, permissions, public-route registry, project profile, or deployment configuration. It does not
migrate other fixture-backed areas. Doctor management and every later live domain require separate approved work.
