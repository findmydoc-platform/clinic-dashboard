# Feature Rules

- Read `docs/engineering/frontend-architecture.md` before feature work.
- Keep business UI under its owning feature area; use Atomic folders only under `components`.
- Keep components free of runtime demo sources, fixtures, browser storage, and external command implementations.
- Keep models free of React, Next.js, DOM APIs, and browser storage.
- Import another feature area only through its explicit `public.ts` contract.
- Give every public component and Screen a direct colocated Storybook story.
