# Desktop editor

The browser and Electron applications share the React editor. Browser uploads,
Lua package uploads, downloads and previews retain their existing workflows.
Desktop controls appear only when the sandboxed preload bridge is present, in
the window title bar's project menu.

## Development and packaging

From the repository root, install dependencies and build the terrain codec:

```sh
pnpm install
node desktop/node_modules/electron/install.js
pnpm run build:terrain-codec
pnpm --dir desktop build
pnpm --dir desktop start
```

If the terminal inherits `ELECTRON_RUN_AS_NODE=1`, unset that variable before
starting Electron. On Linux, `env -u ELECTRON_RUN_AS_NODE pnpm --dir desktop start`
does this for one launch.

`pnpm --dir desktop package` builds installers for the current operating system
in `desktop/release/`. The desktop workflow builds Linux AppImage/deb, Windows
NSIS and macOS dmg/zip artifacts on their respective runners. Signing and
notarization credentials are not configured. Windows and macOS artifacts need
validation on those systems before distribution.

The desktop renderer uses `frontend/dist-desktop/`; the browser continues to use
`frontend/dist/`. Desktop builds exclude the large public game and stock asset
directories. Electron itself is still included in the application package.

## Folder projects

Use **New Project** or **Open Project** in the title bar. A project binds to a
folder containing `pangea.project.json`, targets one game and can contain several
custom levels. Create or upload a level, then use **Save All** to add it. Use
**Project Levels** to select saved custom levels and **Project Settings** to
choose the native base level used for testing. Base slots select the game's
scene and stock assets; they do not create an in-game custom-level menu.

Project layout:

```text
pangea.project.json
.pangea/levels/<custom-id>/   native terrain, textures and per-level Lua bindings
Data/Scripts/                Lua sources, compiled output, definitions and assets
Assets/models/              editable GLB and available native model exports
Assets/sprites/             editable sprite snapshots and original sources
```

Lua definitions and source modules are shared within a project. Per-custom-level
bindings stay separate even when two custom levels use the same native slot.
The dedicated Custom Objects page saves project scripts independently, offers
recovery and participates in the same unsaved-edit and external-change guards.
Scripting is enabled by default in desktop builds; browser defaults are unchanged.
Model and sprite editors expose folder assets through **Project Assets** in the
title bar. Opening an existing project asset preserves its directory when saving.
Model saves include GLB and the existing native export formats supported by the
selected game. Mighty Mike models currently save as GLB. Sprite pixels, masks and
palettes persist in `.sprite.json`, alongside the original `.shapes` source;
native Shapes re-encoding is not implemented. TGA and tileset sources are saved
unchanged. Saving an asset does not automatically create a Lua custom-object
definition or choose a game asset replacement for it.

Saves are explicit. The desktop host checks the disk revision before saving and
uses a rollback journal for multi-file writes. An interrupted save is restored
when the project reopens. Clean documents reload external edits; dirty documents
offer a review of additions, changes and deletions before choosing disk or editor
content. Closing a review retains the pending conflict. Unsaved route changes and
window closure are guarded.

Recovery snapshots are written periodically under Electron's user-data directory,
separately from project files. **Recover Unsaved Work** restores a level snapshot;
**Project Assets** offers asset recovery. Recovery does not replace an explicit
save. Git integration is deferred.

## Optional games and assets

**Games & Downloads** can check releases, choose a version, download a native game,
download its stock editor assets, or locate a trusted existing compatible build.
Games and editor asset packs are independent optional downloads. Installed games
remain available offline. Checking releases and updating are explicit actions;
prereleases require the checkbox.

The catalog comes only from this repository's GitHub releases. A release must
contain `pangea-games.json`, compatible asset-root and Lua contract versions,
runtime packages for all eight games on Linux/Windows/macOS, editor asset packs,
and every declared file at its declared size. Each download is verified against
its declared size and SHA-256 before installation. The native release workflow
generates this catalog and the optional editor packs with
`scripts/build_editor_game_catalog.py`. Existing releases without that catalog
are not offered; use **Locate existing** for a compatible local build.

**Play** launches the installed stock game. **Test Current Level** serializes the
current editor contents, including unsaved edits, into a separate run directory.
Stock game data is copied using copy-on-write where available, then the snapshot
is applied there. The installed game data remains unchanged. Project files under
`Data/` and compiled Lua assets are included. The existing no-scripts preview
action uses an empty Lua workspace. Run directories are removed when games exit.

All eight native ports accept `--editor-data-root-version` (prints `1` without
starting SDL) and `--data-dir /absolute/path/to/Data`. The override requires a
complete Data directory and sets both native asset discovery and the working
directory used by Lua. Older builds are rejected by **Locate existing**. In-game
custom-level selection is deferred.

## Boundaries and verification

`packages/desktop-contracts` defines the Zod IPC schemas. The renderer has no Node
integration; the preload exposes typed requests and event subscriptions. The host
validates request origin, frame, operation and paths, refuses project symlinks,
and limits file sizes and archive extraction. A private `pangea://editor` protocol
serves the renderer and installed stock editor assets.

Useful checks:

```sh
pnpm --dir desktop check
pnpm --dir desktop test
pnpm --dir frontend exec vitest run --coverage.enabled=false src/platform/desktop
pnpm --dir desktop build
pnpm --dir desktop test:e2e
python3 scripts/test_editor_game_catalog.py
```

The desktop suite includes:

- Filesystem integration tests for multi-file saves, rollback after injected disk
  failures, crash journal replay, invalid journals, concurrent saves, stale
  revisions, recovery retention, binary data, and file-size limits.
- Request-schema and protocol tests for malformed messages, unsafe paths, renderer
  and project assets, optional installed assets, response headers, and HEAD requests.
  Protocol unit tests mock Electron's registration and file-fetch boundary.
- Download and installation tests for release filtering, contract compatibility,
  checksums, truncated downloads, HTTP failures, cancellation, concurrent installs,
  retry and cleanup, archive traversal, offline registries, and asset ownership.
  Network replies are fixtures; these tests do not verify live GitHub releases.
- Headless process tests for literal argument handling, diagnostic limits, exit
  status, missing executables, and timeouts. Game staging substitutes a Node process
  for the native game and verifies installed data is preserved.
- Renderer tests for validated bridge responses, disconnections, external-change
  routing, save failure and retry, edits during a save, duplicate save prevention,
  and clean-state tracking while a saved level loads. A real codec round-trip test
  verifies that blank levels preserve required zero-length resources when saved
  and reopened.
- Real Electron E2E tests for sandbox settings, title-bar menus, project creation,
  native level serialization, save/reopen, custom-level switching, external-edit
  conflict review and deletion, folder-selection cancellation, malformed IPC, and
  dirty-project replacement and close guards. Download prompt tests open the real
  missing-assets dialog and cover empty/offline catalogs, asset install/remove,
  and cancellation through real IPC and host services. Only network responses are
  replaced with fixtures; these checks do not verify published game packages.

On Linux, use `PANGEA_ELECTRON_HEADLESS=1 pnpm --dir desktop test:e2e` to run
Electron with Chromium's headless platform and no visible windows. CI runs the
Electron suite under Xvfb on Linux and natively on Windows/macOS, and retains
failure traces. Each E2E case has an isolated profile and project directory;
fixture cleanup waits for Electron to exit. Games UI stories mount the production
component with installed and offline states.

To run the same integration test against an already packaged Linux executable,
set `PANGEA_ELECTRON_EXECUTABLE` to its absolute path. Without the headless option,
the Electron tests open desktop windows. Type checks, service tests, and renderer
unit/integration tests do not open app windows. Packaged executable checks, live
release downloads, native game gameplay, signing, and notarization remain separate
verification tasks.
