## PangeaRSEdit — Copilot Instructions

This repo contains a multi-part editor for classic game terrain and model files. The frontend is a React + TypeScript (Vite) app that integrates a Pyodide worker and multiple webworkers for image/text decompression. The backend tooling (rsrcdump) contains Python/TypeScript utilities for resource handling.

Follow these specific instructions when writing or changing code in this workspace:

- Big picture / architecture

  - Frontend: `frontend/` (Vite, React + TypeScript). Key entry points: `src/main.tsx`, `src/App.tsx`.
  - Parsing & conversion layers live in `frontend/src/editor/loadLogic/`, `frontend/src/data/processors/`, and `frontend/src/python/*` (struct specs); the `modelParsers/` directory contains pure JS/TS binary parsers.
  - The editor view and state lives under `frontend/src/editor/` using Jotai + Immer for state management.
  - Pyodide is used in a worker (`pyodideWorker`) to convert binary game data to a JSON-like structure for the editor; `pyodideWorker` messages and types are in `frontend/src/python/pyodideWorker.ts`.
  - Worker-based image decompression is in `frontend/src/utils` (`lzssWorker`, `jpegDecompressWorker`). Use the worker message types defined in `utils/*` helper typedefs.

- Conventions & patterns

  - Use `Result<T, Error>` for error handling (see `frontend/src/types/result.ts`) — parsers should return `ok(value)` or `err(error)`, and UI logic should check `.ok` instead of relying on thrown exceptions.
  - Prefer detecting per-game logic using `GlobalsInterface.DATA_TYPE` (enum `DataType`) instead of importing the `Game` enum inside runtime-parsing paths to avoid bundler ordering issues (see `frontend/src/data/globals/globals.ts`).
  - Naming patterns: `parseXxxFile.ts` returns a `Result<ottoMaticLevel, Error>` and calls `setData(splitLevelData(...))` as a side-effect on success.
  - Side-effect vs pure: Keep parsing pure where possible and let `setData()` be the side-effect handled by `UploadPrompt`/`openFile` high-level code.
  - Avoid closing over local component state in helper modules. Extract functions to `editor/loadLogic/` or `editor/utils/` for unit testability.
    - Strong guidance: do not create helper functions inside components that capture props/state (closures). Instead, write pure, parameterized helper functions in separate files and import them into components.
    - Prefer `function helper(data, setter, options) { ... }` instead of `const helper = () => { use state... }` inside a component. This keeps logic testable and prevents lifecycle/closure bugs.
    - Example pattern:
      - Before (not recommended):
        - In `UploadPrompt.tsx`: `const handleParseLevelDataFile = async (file) => { /* closes over `globals`, `setData` etc. */ }`
      - After (recommended):
        - Extract to `frontend/src/editor/loadLogic/parseLevelDataFile.ts`:
          `export async function parseLevelDataFile(file, gameType, pyodideWorker, setData) { /* pure logic + setData side-effect */ }`
        - Call from component: `await parseLevelDataFile(file, globals, pyodideWorker, setData)` — the component only handles UI state and displays errors.
    - Benefits: Easier to unit-test `parseLevelDataFile` in isolation, avoid runtime bundler ordering issues and accidental closure over `Game` or Jotai atoms.
    - When an extracted function needs to update UI/atoms, pass the setter callback explicitly (e.g., `setData`) rather than capturing it via closure.
    - Unit testing tip: import extracted function and mock worker messages/`setData` instead of driving a full component.
  - When communicating with webworkers (pyodide, LZSS, JPEG), use message types and result checks — do not set `onmessage` handlers that conflict globally; prefer unique IDs or `addEventListener` to avoid concurrency issues.

- Comments & PR notes (minimal inline comments)

  - Keep inline comments minimal and focused on WHY a non-obvious decision was made, not WHAT was changed.
  - Do not leave comments like `// removed function X` or `// changed this to fix Y` inside code — these are redundant and clutter diffs.
  - If you remove or rename a function, update the tests and document the change in the PR description with a short rationale (1-3 sentences). Put any migration guidance in the PR, not inline comments.
  - When code requires a short inline comment, prefer concise, specific notes (e.g., `// Use DataType to avoid bundler ordering issues`) instead of long explanations or a step-by-step change log.
  - Use the PR description and commit messages for the full explanation and rationale. Include what was changed, why, and any migration steps for consumers.

- Key files to inspect for behavior examples

  - `frontend/src/editor/loadLogic/openFile.ts` — fetches files, calls `parseLevelDataFile()`, and handles images. Check how it uses `setData` and `setMapImages`.
  - `frontend/src/editor/loadLogic/parseLevelDataFile.ts` — dispatcher to `parseNanosaurLevelFile`, `parseMightyMikeFile`, or the pyodide-based parser.
  - `frontend/src/editor/loadLogic/parseNanosaurLevelFile.ts`, `parseMightyMikeFile.ts`, `parsePyodideLevelFile.ts` — each demonstrates the `Result` return type and `setData` conventions.
  - `frontend/src/data/processors/ottoPreprocessor.ts` — how JSON is normalized; returns `Result<void, Error>` on validation errors.
  - `frontend/src/data/globals/globals.ts` — `GlobalsInterface` and preset configs for each game; use these for UI selectors and parsing decisions.
  - `frontend/src/editor/loadLogic/loadMapImages.ts` — image decompression flow using `LzssWorker` and `JpegWorker`, which return canvas elements.

- Developer workflows and commands

  - Start dev server: `cd frontend && npm install && npm run dev` (Vite). This opens the React UI and loads pyodide worker via assets.
  - Run unit tests: `cd frontend && npm run test` (Vitest). Run browser tests: `npm run test:browser`.
  - Build: `cd frontend && npm run build` (runs `tsc -b` & Vite build). To preview: `npm run preview`.
  - There are Playwright/Browser tests and `vitest-browser` support; check `package.json` for scripts and dev dependencies.

- Test & debugging tips

  - When adding unit tests, mock worker messages and avoid invoking real Pyodide; see `openFile.test.ts` for examples of mocking `fetch`/`parseLevelDataFile`.
  - If you add worker logic, extract functions so core logic is testable in Node tests without running a real worker.
