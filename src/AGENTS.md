# Application Source Rules

These rules apply to application code under `src/**`. Nested `AGENTS.md` files add narrower constraints for their domains.

## Engineering Method Anchors

- Use Component-Driven Development (CDD) through Storybook.
- Use Component Story Format (CSF).
- Use Hexagonal Architecture (Ports & Adapters).

## UI Design

- Use pill-shaped labels and badges sparingly. Do not default to a pill whenever small contextual information needs emphasis.
- Prefer typography, spacing, grouping, inline metadata, icons, or separators before introducing a pill.
- Reserve pills for compact states, counts, or selectable filters when the enclosed shape communicates meaning or interaction. Do not use them for ordinary descriptive taxonomy or repeated labels unless an approved design specifically requires it.

## Light And Dark Mode

- Treat light and dark mode as supported states for every UI change.
- Use light mode for the default handoff screenshot.
- Account for both themes in colors, surfaces, borders, states, charts, and image overlays. A separate dark-mode screenshot is not required by default.
- Require a dark-mode visual check and screenshot when a change affects theme behavior, colors, contrast, status states, overlays, or fixes a dark-mode regression.
