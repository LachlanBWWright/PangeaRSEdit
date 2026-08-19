# Scripts

All scripts resolve paths from the repository root, so they can be called from
any working directory. Run them directly from the repository root for the
shortest commands.

## Development and verification

| Script | Suggested command name | Purpose |
| --- | --- | --- |
| `scripts/dev-everything.sh` | `dev-everything` | Incrementally update every game WASM runtime, then start the frontend/backend stack. |
| `scripts/dev-frontend.sh` | `dev-frontend` | Start the Vite development server. Extra Vite arguments are forwarded. |
| `scripts/dev-backend.sh` | `dev-backend` | Start the .NET API development server. Extra application arguments are forwarded. |
| `scripts/multiplayer.sh` | `dev-multiplayer` | Start the integrated frontend/backend multiplayer stack. |
| `scripts/lint.sh` | `lint` | Run frontend ESLint and verify backend formatting. |
| `scripts/test.sh` | `test` | Run frontend Vitest tests with coverage and backend .NET tests with coverage collection. |
| `scripts/test-e2e.sh` | `test-e2e` | Run Playwright end-to-end tests, including its configured Vite server. |
| `scripts/build-production.sh` | `build-production` | Build the frontend and publish the backend in Release mode. |
| `scripts/preview-production.sh` | `preview-production` | Build if needed, then serve the frontend production bundle locally. |
| `scripts/test-ci.sh` | `test-ci` | Reproduce the frontend and backend CI checks with locked dependencies, test discovery verification, and coverage output. |
| `scripts/test-rust-coverage.sh` | `test-rust-coverage` | Run `cargo llvm-cov` for the Rust terrain codec and generate an LCOV report. |
| `scripts/test-container.sh` | `test-container` | Build the backend Docker image without pushing it. |
| `scripts/analyze-complexity.sh` | `analyze-complexity` | Report oversized or deeply nested frontend source files. |

Examples:

```bash
scripts/dev-everything.sh
scripts/dev-frontend.sh --host 0.0.0.0
scripts/dev-backend.sh
scripts/lint.sh
scripts/test.sh
scripts/test-e2e.sh --project chromium
scripts/build-production.sh
scripts/preview-production.sh --host 0.0.0.0
scripts/test-ci.sh
scripts/test-container.sh
```

`test-e2e.sh` expects the Playwright Chromium browser to be installed. Install
it once with `pnpm --dir frontend exec playwright install chromium`.

`dev-everything.sh` is the single-command full startup path. It fingerprints
each game's inputs, rebuilds only changed or missing runtimes, and starts the
frontend plus a freshly compiled multiplayer backend. `multiplayer.sh` uses the
same preparation path; pass `--rebuild-games` only when you intentionally want
a refresh of every staged runtime.

`test-container.sh` uses `pangearsedit-api:local` as its image tag. Override it
with `PANGEA_BACKEND_IMAGE`, for example:

```bash
PANGEA_BACKEND_IMAGE=pangearsedit-api:smoke scripts/test-container.sh
```

## Build all game WASM assets

Use this script when you need to build every Pangea Ports game and copy the generated runtime files into the frontend public folders:

```bash
scripts/build-games.sh
```

It stages each game's `.js`, `.wasm`, and `.data` files under:

```text
frontend/public/generated/pangea-ports/wasm/<game>/
```

From inside `frontend/`, this is also available as:

```bash
pnpm run build:games
```

`build-games.sh` is a friendly alias for `build-pangea-ports.sh`, which contains the implementation and also supports building one game:

```bash
scripts/build-pangea-ports.sh --game ottomatic
```

Build directories are retained so CMake can also reuse unchanged object files
inside a game that needs rebuilding. Input fingerprints are stored beside the
generated assets as `.build-input.sha256` files.

## Multiplayer asset rebuilds

`multiplayer.sh` checks every game runtime before starting. A game is rebuilt
when its own sources, shared runtime sources, or build tooling changed, or when
its staged JavaScript/WASM files are missing. To force every game build, run:

```bash
scripts/multiplayer.sh --rebuild-games
```

For a one-off refresh without starting the multiplayer stack, run the relevant game build directly:

```bash
scripts/build-pangea-ports.sh --game cromagrally
scripts/build-pangea-ports.sh --game nanosaur2
```

## Other scripts

- `build-pangea-ports.sh`: implementation used by `build-games.sh`; builds all games by default or one game with `--game`.
- `multiplayer.sh`: updates all changed game runtimes and starts the local frontend/backend stack; use `--rebuild-games` to force every runtime build.
- `analyze-complexity.sh`: reports frontend files over line-count and indentation-depth thresholds.
