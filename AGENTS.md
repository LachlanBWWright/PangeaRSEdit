Follow these project standards for all code changes:

Never use TypeScript `any`, or type assertions. Model unknown values explicitly and narrow them safely.
Never throw exceptions. Use `neverthrow` (`Result`, `ResultAsync`) for recoverable failure paths.
Use `Result.fromThrowable` and `ResultAsync.fromPromise` only at third-party or external boundaries that may throw or reject. Wrap those exceptions immediately at the boundary and expose typed `Result` or `ResultAsync` APIs to the rest of the codebase. Internal functions must never throw; model their failures directly with `Result` or `ResultAsync` instead of wrapping internal calls with `fromThrowable` or `fromPromise`.
Never disable ESLint rules, TypeScript checks, or type checking comments to bypass errors.
Use Zod to parse and validate unknown data at runtime before treating it as typed data.10 +- Avoid introspection-like solutions such as `typeof`, `instanceof`, and custom `value is Type` guard functions wherever feasible. Prefer schema parsing and explicit typed inputs.
Write high-quality React code: keep components focused, make state ownership clear, and avoid unnecessary re-renders.
Keep Storybook and visual-test concerns out of production components. Put stories, fixtures, test selectors, decorators, and screenshot or overflow-test markup in dedicated `*.stories.*`, test, or Storybook configuration files. Only add markup or attributes to production components when they serve a genuine runtime semantic, accessibility, or product requirement.
Aim for files to stay under 300 lines wherever practical. When a React component approaches that size, split it into smaller focused components, hooks, and logic modules instead of letting one file accumulate UI, state transitions, and business rules.
Minimize `useEffect`. Prefer derived values, event handlers, framework data APIs, and explicit state transitions before reaching for effects.
Have a strong preference for parameterized functions in separate files over in-component closures. Pass dependencies explicitly so logic remains importable, testable, and independent of component render scope.
Move logic out of React render-scope closures and into named functions in their own files whenever the logic is reusable, testable, or more than a small event adapter. Components should primarily compose UI and wire explicit inputs/outputs.
Target a maximum of about 3-4 levels of indentation. If code needs deeper nesting, break it into smaller functions, use early returns, or restructure the control flow.
Never use scripts to edit files, they are too prone to introducing mass-errors. You must make all edits yourself.
Never make commits. You should only use read-only Git commands.
Keep inline comments minimal and focused on WHY a non-obvious decision was made, not WHAT was changed.
Do not leave comments like `// removed function X` or `// changed this to fix Y` inside code — these are redundant and clutter diffs.
Design editor controls around the meaning and valid domain of the data: use named checkboxes for bit flags, dropdowns or other constrained selectors for enumerated values, and structured list editors for collections. Do not expose raw flags, opaque parameters, or delimiter-separated numeric text fields when a semantic control is possible. Consider discoverability, visual context, space usage, and editing safety as part of every UI change.
Keep Konva scene graphs small. Dense tile grids, masks, heatmaps, vertex-color fields, path fields, palettes, and similar overlays must be composed into a small number of raster canvases and rendered as one Konva image, following the topology renderer pattern. Do not create one Konva node per tile, pixel, cell, arrow, or other repeated map element when the data can be rasterized; reserve individual nodes for genuinely interactive handles and sparse objects.
