# Terrain Data Rust WASM Level I/O Plan

## Goal

Refactor terrain data loading and saving so level texture codecs run through multithreaded Rust WebAssembly, while keeping the editor state typed, testable, and independent of browser worker details. Most supported games should use LZSS compression and decompression through the Rust WASM path. Nanosaur 2 should use JPEG decode and encode through the same worker-facing architecture. Add ShadCN/Sonner toast feedback around load, save, export, and long-running terrain operations so users can see progress and failures without checking the console.

## Current System Shape

- The frontend is a Vite/React app in `frontend/`.
- Terrain data is represented through `LevelData`, `TerrainData`, and related structures in `frontend/src/python/structSpecs/LevelTypes.ts`.
- Level loading flows through `frontend/src/editor/loadLogic/openFile.ts`, `parseLevelDataFile.ts`, and map image loading in `frontend/src/editor/loadLogic/loadMapImages.ts`.
- Standard supertile image loading currently creates one browser worker per supertile in `loadMapImages.ts`.
- LZSS work is currently TypeScript-based through `frontend/src/utils/lzssWorker.ts`, `frontend/src/utils/lzss.ts`, and `frontend/src/utils/imageConverter.ts`.
- JPEG decompression for Nanosaur 2 currently flows through `frontend/src/utils/jpegDecompressWorker.ts` and `frontend/src/utils/jpegDecompress.ts`.
- There is already a Rust/WASM package under `lzss-rust/`, but it is not the general terrain I/O boundary for all load and save flows.
- Toasts already exist in some UI paths through `sonner`, including level download, parsing, tile editing, and map image updates. Feedback is uneven across expensive operations.

## Problems To Solve

- Terrain texture codec logic is split between TypeScript workers, direct canvas manipulation, and game-specific branches.
- Spawning one worker per image can create unnecessary overhead, makes progress reporting coarse, and complicates cancellation.
- Save/export should use the same codec boundary as load so round trips are predictable and testable.
- Nanosaur 2 uses JPEG supertile payloads while most other games use LZSS-compressed 16-bit texture payloads, so the architecture needs an explicit codec selection model rather than scattered conditionals.
- Worker failures are currently easy to lose because some worker paths return early without a typed error response.
- Users need visible feedback while terrain images are decoding, encoding, saving, or failing.

## Target Architecture

Introduce a small terrain I/O layer with three explicit boundaries:

- `terrainCodec`: pure TypeScript request/response types, game codec selection, validation schemas, and `Result`/`ResultAsync` APIs.
- `terrainCodecWorker`: browser worker pool and message protocol, with no React dependencies.
- `terrainCodecWasm`: Rust WASM package exports for LZSS and JPEG operations, wrapped by typed TypeScript functions.

Suggested frontend layout:

```text
frontend/src/data/terrain-io/
  terrainCodec.ts
  terrainCodecSchemas.ts
  terrainCodecTypes.ts
  terrainCodecWorkerClient.ts
  terrainImageAssembly.ts
  terrainImageSerialization.ts
  terrainIoErrors.ts
  terrainIoProgress.ts
  __tests__/

frontend/src/workers/
  terrainCodec.worker.ts
```

Suggested Rust layout:

```text
terrain-codec-rust/
  Cargo.toml
  src/
    lib.rs
    lzss.rs
    jpeg.rs
    terrain_image.rs
    errors.rs
  pkg/
```

If reusing `lzss-rust/` is cleaner, rename or expand it only after checking package references. Avoid leaving two Rust packages that both claim ownership of LZSS terrain compression.

## Codec Model

Define a typed codec selector from game globals or game id:

- `lzss-rgb555`: Bugdom 2, Otto Matic, Cro-Mag Rally, Billy Frontier, and any other standard LZSS supertile games.
- `jpeg-supertile`: Nanosaur 2.
- `raw-classic`: Bugdom 1, Nanosaur 1, or Mighty Mike paths that do not use the standard LZSS/JPEG supertile stream.

The codec selector should return a typed configuration:

```ts
export type TerrainTextureCodec =
  | {
      readonly kind: "lzss-rgb555";
      readonly supertileTexmapSize: number;
      readonly bytesPerPixel: 2;
    }
  | {
      readonly kind: "jpeg-supertile";
      readonly supertileTexmapSize: number;
    }
  | {
      readonly kind: "raw-classic";
      readonly tileSize: number;
    };
```

Use Zod at worker boundaries to parse unknown `postMessage` payloads before treating them as typed. Avoid type assertions in message handlers.

## Rust WASM Scope

Rust should own CPU-heavy codec work:

- LZSS decompress compressed supertile bytes into RGB555/RGBA output.
- LZSS compress edited RGBA or RGB555 supertile data back into game-ready bytes.
- JPEG decode Nanosaur 2 supertile bytes into RGBA output.
- JPEG encode edited Nanosaur 2 supertile RGBA data back into game-ready bytes.
- Return typed error codes and messages that TypeScript maps into `TerrainIoError`.

Rust should not own:

- React state.
- Toast display.
- File input elements or downloads.
- Game metadata decisions that already live cleanly in TypeScript.
- Canvas DOM creation.

At the TypeScript boundary, wrap WASM calls with `Result`/`ResultAsync`. Any Rust/WASM call that can throw because of initialization, memory pressure, bad bytes, or a codec failure must be caught at the wrapper boundary and converted to a typed error.

## Multithreaded WASM Worker Strategy

Use a fixed-size terrain worker pool instead of one worker per supertile.

Recommended first version:

- One browser worker module owns WASM initialization.
- The worker creates an internal queue and processes multiple supertile jobs concurrently when SharedArrayBuffer and WASM threads are available.
- Fall back to single-threaded WASM inside the same worker when cross-origin isolation is unavailable.
- The main thread receives progress updates such as `queued`, `started`, `completed`, and `failed`.
- The pool size should default to `Math.max(1, navigator.hardwareConcurrency - 1)` with a conservative upper bound.

Browser requirements:

- Confirm whether the app can enable `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for SharedArrayBuffer.
- Document local dev and production hosting requirements if multithreaded WASM requires cross-origin isolation.
- Keep a non-threaded worker fallback so level loading still works on constrained hosts.

## Load Flow

Replace `loadMapImages.ts` internals in stages:

1. Parse the supertile stream into typed `TerrainTextureChunk` records without decoding.
2. Select the codec from game globals.
3. Send chunks to `terrainCodecWorkerClient`.
4. Receive `ImageData` or RGBA buffers with stable supertile ids.
5. Assemble canvases in `terrainImageAssembly.ts`.
6. Return `Result<HTMLCanvasElement[], TerrainIoError>` or map to existing string errors only at the legacy call site.

For LZSS games:

- Read each compressed chunk length.
- Decompress through Rust WASM.
- Convert RGB555 to RGBA in Rust or in a tightly scoped TypeScript helper, but keep one canonical path.

For Nanosaur 2:

- Preserve the existing image description offset handling.
- Decode JPEG bytes through the Rust WASM JPEG path.
- Preserve the current vertical flip behavior if it matches the game format.

## Save Flow

Add a matching save/export path that serializes terrain texture data using the selected codec.

For LZSS games:

- Extract edited supertile `ImageData`.
- Convert RGBA to RGB555.
- Compress with Rust WASM LZSS.
- Write each compressed chunk with the expected size prefix.

For Nanosaur 2:

- Extract edited supertile `ImageData`.
- Apply the inverse of the load-time vertical flip if required.
- Encode to JPEG with a quality setting that preserves current game compatibility.
- Rebuild the Nanosaur 2 image description prefix and JPEG payload layout.

Add round-trip tests for:

- LZSS decode then encode produces bytes accepted by the parser.
- LZSS encode then decode preserves representative pixel data within exact RGB555 limits.
- Nanosaur 2 JPEG decode then encode produces a valid JPEG supertile stream.
- Invalid compressed data returns typed errors instead of hanging or silently skipping a tile.

## Terrain Data Refactor

Separate terrain state concerns before replacing the codec backend:

1. Keep parsed level structures as the source of truth for gameplay data.
2. Treat rendered texture canvases as derived/editable terrain image state.
3. Introduce importable functions for:
   - reading supertile texture chunks from a `DataView`;
   - decoding chunks into image buffers;
   - assembling canvases;
   - extracting edited canvas image data;
   - encoding image data back into texture chunks;
   - writing chunks back into the level payload.
4. Keep these functions outside React components and workers where possible.
5. Let React components call small orchestration functions and update state from explicit results.

This should reduce coupling between `openFile.ts`, `loadMapImages.ts`, tile menus, and save/export UI.

## Toast Feedback Plan

Use existing ShadCN/Sonner toast infrastructure. Add feedback at operation boundaries, not inside low-level codec helpers.

Recommended feedback points:

- Level load started: `toast.loading("Loading level", { description: fileName })`.
- Terrain decode progress: update the loading toast every meaningful percentage step for large levels.
- Level load success: replace loading toast with `toast.success("Level loaded", { description: levelName })`.
- Level parse failure: `toast.error("Failed to parse level data", { description: typedErrorMessage })`.
- Terrain decode failure: include codec and supertile index in the description.
- Save/export started: `toast.loading("Saving level", { description: gameName })`.
- Save/export success: `toast.success("Level saved", { description: outputFileName })`.
- Save/export failure: `toast.error("Failed to save level", { description: typedErrorMessage })`.
- Worker fallback: `toast.info("Using compatibility terrain processing")` when threaded WASM is unavailable.
- Cancellation: `toast("Terrain processing cancelled")` when the user cancels a long operation.

Avoid toast spam:

- Reuse toast ids for progress updates.
- Do not show one toast per supertile.
- Keep low-level utilities UI-free and report progress through typed callbacks or observable state.

## Implementation Phases

### Phase 1: Inventory And Contracts

- Identify every load, save, export, and texture-edit path that reads or writes terrain image bytes.
- Document which games use LZSS, JPEG, raw classic textures, or custom paths.
- Add `TerrainTextureCodec` and `TerrainIoError` types.
- Add Zod schemas for worker request and response messages.
- Add tests for codec selection and supertile stream parsing.

### Phase 2: Rust WASM Boundary

- Decide whether to expand `lzss-rust/` or create `terrain-codec-rust/`.
- Expose Rust functions for LZSS decode/encode first.
- Wrap WASM initialization and calls in typed TypeScript `ResultAsync` APIs.
- Keep the existing TypeScript worker path available behind a feature flag or fallback until parity is verified.
- Add fixture-based parity tests against current TypeScript LZSS behavior.

### Phase 3: Worker Pool

- Replace one-worker-per-supertile with `terrainCodecWorkerClient`.
- Add queueing, progress, cancellation, and typed failure responses.
- Add fallback behavior for browsers without threaded WASM support.
- Add load-time progress callbacks for UI orchestration.

### Phase 4: LZSS Load And Save

- Route standard LZSS game loading through the Rust WASM worker client.
- Add save/export serialization for edited LZSS terrain textures.
- Add round-trip tests for representative standard games.
- Add toasts for load/save start, progress, success, and failure.

### Phase 5: Nanosaur 2 JPEG Load And Save

- Move Nanosaur 2 JPEG decode into the same worker client architecture.
- Add Rust WASM JPEG encode support.
- Preserve image description records and vertical orientation rules.
- Add Nanosaur 2 save/export tests and fixture validation.
- Add targeted toasts that distinguish JPEG codec failures from level parse failures.

### Phase 6: Cleanup And Removal

- Remove or retire old TypeScript codec paths once tests cover Rust parity.
- Simplify `loadMapImages.ts` into orchestration or replace it with the terrain I/O module.
- Remove duplicated canvas conversion helpers if Rust owns RGB555/RGBA conversion.
- Update developer docs with WASM build commands, cross-origin isolation requirements, and fallback behavior.

## Testing And Verification

Automated tests:

- Unit tests for codec selection.
- Unit tests for supertile stream parsing and writing.
- Worker protocol schema tests using representative unknown payloads.
- Rust unit tests for LZSS edge cases and JPEG error handling.
- WASM integration tests for decode and encode wrappers.
- Frontend tests for load/save orchestration and toast state changes.

Manual verification:

- Load and save at least one level for each standard LZSS game.
- Load and save Nanosaur 2 terrain and confirm the game/editor can reload the result.
- Edit a supertile, export, reload, and verify the edit persists.
- Test a deliberately corrupted texture stream and confirm a clear error toast appears.
- Test on a browser/session without SharedArrayBuffer support and confirm fallback behavior.

Suggested commands once implementation exists:

```bash
npm test -- terrain-io
npm test -- loadMapImages
npm test
```

Run the Rust package tests and WASM build command from whichever Rust package owns terrain codecs.

## Acceptance Criteria

- Standard LZSS terrain loading uses the Rust WASM worker path.
- Standard LZSS terrain saving/export uses the same Rust WASM codec path.
- Nanosaur 2 JPEG terrain loading and saving/export use the terrain worker architecture.
- The worker protocol is Zod-validated at unknown message boundaries.
- Recoverable failures return typed `Result` or `ResultAsync` errors; new code does not throw exceptions.
- Long-running terrain operations show ShadCN/Sonner toasts for start, progress, success, cancellation, and failure.
- Toast progress updates reuse existing toast ids and do not emit one toast per supertile.
- Existing supported game load flows continue to work, including non-threaded fallback.
- Round-trip tests cover LZSS games and Nanosaur 2 JPEG terrain.

## Risks And Open Questions

- Multithreaded WASM may require cross-origin isolation headers that are not currently configured for every deployment target.
- JPEG encoding settings for Nanosaur 2 need compatibility verification against the original game expectations.
- Existing level save/export code may need broader refactoring if terrain bytes are not currently preserved separately from parsed editor state.
- Large texture payloads may need transfer-list discipline to avoid copying buffers between the main thread and workers.
- Fixture coverage is important before replacing the current TypeScript LZSS implementation.
