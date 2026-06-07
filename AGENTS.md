Follow these project standards for all code changes:

Never use TypeScript `any`, or type assertions. Model unknown values explicitly and narrow them safely.
Never throw exceptions. Use `neverthrow` (`Result`, `ResultAsync`) for recoverable failure paths.
Wrap third-party libraries that can throw exceptions with `neverthrow` at the boundary, then expose typed `Result` or `ResultAsync` APIs to the rest of the codebase.
Never disable ESLint rules, TypeScript checks, or type checking comments to bypass errors.
Use Zod to parse and validate unknown data at runtime before treating it as typed data.10 +- Avoid introspection-like solutions such as `typeof`, `instanceof`, and custom `value is Type` guard functions wherever feasible. Prefer schema parsing and explicit typed inputs.
Write high-quality React code: keep components focused, make state ownership clear, and avoid unnecessary re-renders.
Aim for files to stay under 300 lines wherever practical. When a React component approaches that size, split it into smaller focused components, hooks, and logic modules instead of letting one file accumulate UI, state transitions, and business rules.
Minimize `useEffect`. Prefer derived values, event handlers, framework data APIs, and explicit state transitions before reaching for effects.
Strongly prefer parameterized functions in their own files over closures. Keep business logic importable, testable, and independent of component render scope.
Move logic out of React render-scope closures and into named functions in their own files whenever the logic is reusable, testable, or more than a small event adapter. Components should primarily compose UI and wire explicit inputs/outputs.
Target a maximum of about 3-4 levels of indentation. If code needs deeper nesting, break it into smaller functions, use early returns, or restructure the control flow.
Never use scripts to edit files, they are too prone to introducing mass-errors. You must make all edits yourself.
Never make commits. You should only use read-only Git commands.
Keep inline comments minimal and focused on WHY a non-obvious decision was made, not WHAT was changed.
Do not leave comments like `// removed function X` or `// changed this to fix Y` inside code — these are redundant and clutter diffs.
