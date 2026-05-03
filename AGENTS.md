Follow these project standards for all code changes:

Never use TypeScript `any`, or type assertions. Model unknown values explicitly and narrow them safely.
Never throw exceptions. Use `neverthrow` (`Result`, `ResultAsync`) for recoverable failure paths.
Wrap third-party libraries that can throw exceptions with `neverthrow` at the boundary, then expose typed `Result` or `ResultAsync` APIs to the rest of the codebase.
Never disable ESLint rules, TypeScript checks, or type checking comments to bypass errors.
Use Zod to parse and validate unknown data at runtime before treating it as typed data.10 +- Avoid introspection-like solutions such as `typeof`, `instanceof`, and custom `value is Type` guard functions wherever feasible. Prefer schema parsing and explicit typed inputs.
Write high-quality React code: keep components focused, make state ownership clear, and avoid unnecessary re-renders.
Minimize `useEffect`. Prefer derived values, event handlers, framework data APIs, and explicit state transitions before reaching for effects.
Strongly prefer parameterized functions in their own files over closures. Keep business logic importable, testable, and independent of component render scope.
Never use scripts to edit files, they are too prone to introducing mass-errors. You must make all edits yourself.
Never make commits. You should only use read-only Git commands.
Keep inline comments minimal and focused on WHY a non-obvious decision was made, not WHAT was changed.
Do not leave comments like `// removed function X` or `// changed this to fix Y` inside code — these are redundant and clutter diffs.
