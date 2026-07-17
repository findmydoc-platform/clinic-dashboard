# Component Rules

- Do not recreate global `atoms`, `molecules`, `organisms`, or `templates` folders under `src/components`; add business UI under `src/features` and domain-neutral UI under `src/components/ui`.
- Follow `docs/engineering/frontend-architecture.md` for Atomic classification and import boundaries.
- Render company identity through BrandMark and the canonical assets in public/brand; do not replace the wordmark with plain text.
- Keep server data access outside reusable components.
- Use shared UI primitives before adding a new local primitive.
- Add deterministic Storybook stories for reusable components and cover keyboard behavior when interactive.
