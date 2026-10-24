# Test Rules

- Use unit tests for policy logic and deterministic business behavior.
- Keep Storybook stories isolated from real providers and external APIs.
- Select integration tests according to the affected approved system boundary and its risk; persistent storage is not a prerequisite. Follow `.codex/skills/test-strategy/SKILL.md` for controlled sessions, synthetic data, and resettable provider state.
- Keep the foundation E2E test public and data-less until authentication is implemented.
