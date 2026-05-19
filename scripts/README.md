# Scripts

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
npm run build:games
```

`build-games.sh` is a friendly alias for `build-pangea-ports.sh`, which contains the implementation and also supports building one game:

```bash
scripts/build-pangea-ports.sh --game ottomatic
```

`multiplayer.sh` only builds the runtime assets needed by the multiplayer dev stack when they are missing, currently Cro-Mag Rally and Nanosaur 2. It is not the all-games build script.

## Multiplayer asset rebuilds

`multiplayer.sh` checks for these staged files before starting the dev stack:

```text
frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.js
frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.wasm
frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.data
frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.js
frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.wasm
frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.data
```

If any are missing, it runs:

```bash
scripts/build-pangea-ports.sh --game cromagrally
scripts/build-pangea-ports.sh --game nanosaur2
```

It does not detect whether the game source changed. After editing game code, pulling `games/pangea-ports`, or otherwise needing to sync fresh runtime assets into the frontend, force those two multiplayer builds with:

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
- `multiplayer.sh`: starts the local multiplayer frontend/backend test stack; use `--rebuild-games` to sync fresh Cro-Mag Rally and Nanosaur 2 runtime assets first.
- `analyze-complexity.sh`: reports frontend files over line-count and indentation-depth thresholds.
