# ADR 0001: Design Source Synchronization

## Context

findmydoc products need a shared visual and trust baseline without introducing a published design-system package in the clinic dashboard foundation.

## Decision

The repository vendors `DESIGN.md`, the canonical findmydoc logo assets, design tokens, and DM Sans from the source template. Product surfaces render these assets through `BrandMark` instead of recreating the wordmark as text. Changes are synchronized deliberately through reviewed pull requests.

## Consequences

The application has no runtime dependency on the website or template repositories. It can evolve its product-specific UI while keeping the source design document visible and reviewable.
