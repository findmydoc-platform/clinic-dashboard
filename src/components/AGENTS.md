# Component Rules

- Preserve Atomic Design boundaries: atoms are presentation-only, molecules compose atoms, organisms compose interactions and layout.
- Render company identity through BrandMark and the canonical assets in public/brand; do not replace the wordmark with plain text.
- Keep server data access outside reusable components.
- Use shared UI primitives before adding a new local primitive.
- Add deterministic Storybook stories for reusable components and cover keyboard behavior when interactive.
