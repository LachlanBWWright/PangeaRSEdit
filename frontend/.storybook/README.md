# Storybook authoring guide

## Required conventions

- Keep production code and stories in separate files. Stories live in adjacent `*.stories.tsx` files next to the component or page they exercise.
- Prefer meaningful product states over prop permutations. The story should answer a product question, not simply render a component with a different value.
- Use deterministic fixtures: no live network calls, timestamps, random IDs, locale-specific machine data, or browser-only storage.
- Add viewport metadata for responsive layouts and include explicit overflow assertions for narrow and constrained views.
- Use tags to document intent and test coverage; the default Storybook test tag must be present unless a story is explicitly exempted.

## Required tags

Use the following tags on stories when they apply:

- `smoke` — render smoke coverage and no-console verification
- `interaction` — keyboard or pointer interaction testing
- `overflow` — constrained-width or overflow regression coverage
- `a11y` — accessibility verification is expected
- `visual` — screenshot or visual regression coverage
- `expensive` — long-running or heavy operations
- `test` — default tag for all non-exempt production stories

## Story naming and organization

- Follow Storybook title patterns such as `UI/...`, `Editor/Shared/...`, `Editor/Terrain/...`, `Editor/Scripts/...`, `Viewers/...`, `Multiplayer/...`, and `Pages/...`.
- Keep names descriptive and state-driven (`Default`, `Loading`, `Error`, `LongName`, `NarrowLayout`, `DialogInteraction`, etc.).
- Add a `play` function for the primary interaction path and at least one failure flow when a story represents a workflow.

## Responsive and accessibility expectations

- Assume the smallest supported viewport for the component and add a matching `parameters.viewport` or explicit style fixture.
- Keep actions reachable and visible at 320px and for 200% text zoom.
- Include `aria-*` labels, focus-visible states, and accessible dialog semantics where applicable.
- Verify error and loading states through both UI semantics and screen-reader-friendly text.

## Storybook coverage commands

- `pnpm run storybook` — local Storybook development server
- `pnpm run build-storybook` — production Storybook bundle
- `pnpm run storybook:test` — component tests in Chromium
- `pnpm run storybook:test:watch` — watch mode
- `pnpm run storybook:test:coverage` — component coverage report
- `pnpm run storybook:smoke` — smoke-only Storybook validation
- `pnpm run test-storybook` — Playwright Storybook accessibility and interaction suite
- `pnpm run capture-storybook` — screenshot regression capture
