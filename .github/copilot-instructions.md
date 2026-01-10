## PangeaRSEdit — Copilot Instructions

This repo contains a multi-part editor for classic game terrain and model files. The frontend is a React + TypeScript (Vite) app that integrates a Pyodide worker and multiple webworkers for image/text decompression. The backend tooling (rsrcdump) contains Python/TypeScript utilities for resource handling.

Follow these specific instructions when writing or changing code in this workspace:

- Big picture / architecture

  - Frontend: `frontend/` (Vite, React + TypeScript). Key entry points: `src/main.tsx`, `src/App.tsx`.
  - Parsing & conversion layers live in `frontend/src/editor/loadLogic/`, `frontend/src/data/processors/`, and `frontend/src/python/*` (struct specs); the `modelParsers/` directory contains pure JS/TS binary parsers.
  - The editor view and state lives under `frontend/src/editor/` using Jotai + Immer for state management.
  - Worker-based image decompression is in `frontend/src/utils` (`lzssWorker`, `jpegDecompressWorker`). Use the worker message types defined in `utils/*` helper typedefs.

- Conventions & patterns

  - Use `Result<T, Error>` for error handling (see `frontend/src/types/result.ts`) — NEVER throw exceptions.
  - NEVER use type assertions, the 'any' type, or comments disabling TypeScript and Linter checks under any circumstances
  - Prefer detecting per-game logic using `GlobalsInterface.DATA_TYPE` (enum `DataType`) instead of importing the `Game` enum inside runtime-parsing paths to avoid bundler ordering issues (see `frontend/src/data/globals/globals.ts`).
  - Naming patterns: `parseXxxFile.ts` returns a `Result<ottoMaticLevel, Error>` and calls `setData(splitLevelData(...))` as a side-effect on success.
  - Side-effect vs pure: Keep parsing pure where possible and let `setData()` be the side-effect handled by `UploadPrompt`/`openFile` high-level code.
  - Avoid closing over local component state in helper modules. Extract functions to `editor/loadLogic/` or `editor/utils/` for unit testability.
  - When communicating with webworkers (LZSS, JPEG), use message types and result checks — do not set `onmessage` handlers that conflict globally; prefer unique IDs or `addEventListener` to avoid concurrency issues.

- Comments & PR notes (minimal inline comments)

  - Keep inline comments minimal and focused on WHY a non-obvious decision was made, not WHAT was changed.
  - Do not leave comments like `// removed function X` or `// changed this to fix Y` inside code — these are redundant and clutter diffs.
  - When code requires a short inline comment, prefer concise, specific notes (e.g., `// Use DataType to avoid bundler ordering issues`) instead of long explanations or a step-by-step change log.

- Key files to inspect for behavior examples

  - `frontend/src/editor/loadLogic/openFile.ts` — fetches files, calls `parseLevelDataFile()`, and handles images. Check how it uses `setData` and `setMapImages`.
  - `frontend/src/editor/loadLogic/parseLevelDataFile.ts` — dispatcher to `parseNanosaurLevelFile`, `parseMightyMikeFile`, or the pyodide-based parser.
  - `frontend/src/editor/loadLogic/parseNanosaurLevelFile.ts`, `parseMightyMikeFile.ts`, `parsePyodideLevelFile.ts` — each demonstrates the `Result` return type and `setData` conventions.
  - `frontend/src/data/processors/ottoPreprocessor.ts` — how JSON is normalized; returns `Result<void, Error>` on validation errors.
  - `frontend/src/data/globals/globals.ts` — `GlobalsInterface` and preset configs for each game; use these for UI selectors and parsing decisions.
  - `frontend/src/editor/loadLogic/loadMapImages.ts` — image decompression flow using `LzssWorker` and `JpegWorker`, which return canvas elements.

- Developer workflows and commands

  - Start dev server: `npm run dev` (Vite).   - Testing commands: `npm run lint`, `npm run build`, `npm run test`



