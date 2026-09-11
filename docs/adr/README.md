# Architecture Decision Records

This directory contains the Clinic Dashboard's Architecture Decision Records. Use [ADR according to Nygard](https://llm-coding.github.io/Semantic-Anchors/anchor/adr-according-to-nygard/) for durable architectural decisions and keep repository-specific conventions authoritative.

## Lifecycle

Only a proposed or draft ADR may be revised. An ADR is closed once it is accepted, rejected, deprecated, or superseded. A status-less ADR already used as a governing project decision is also treated as accepted.

Closed ADRs are immutable. Do not rewrite their context, decision, rationale, consequences, scope, or historical evidence. If a decision changes, create a new ADR and link both records. The closed record may receive only the lifecycle metadata needed to mark it deprecated or superseded and identify its replacement.

Keep every closed record in version control. Historical in-place revisions do not authorize further edits.

Treat any revisit or update wording inside a closed ADR as a trigger for a successor, not as permission to edit the closed record.

## Records

- [ADR 0001: Design Source Synchronization](0001-design-sync.md)
- [ADR 0002: Feature-First Atomic Frontend Architecture](0002-feature-first-atomic-architecture.md)
- [ADR 0003: Domain Data Provider Composition](0003-domain-data-provider-composition.md)

## Primary Sources

- [Semantic Anchors: ADR according to Nygard](https://llm-coding.github.io/Semantic-Anchors/anchor/adr-according-to-nygard/)
- [Michael Nygard: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
