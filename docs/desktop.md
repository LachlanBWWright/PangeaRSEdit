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
pnpm --dir desktop run build
pnpm --dir desktop run start
```

If the terminal inherits `ELECTRON_RUN_AS_NODE=1`, unset that variable before
starting Electron. On Linux, `env -u ELECTRON_RUN_AS_NODE pnpm --dir desktop run start`
does this for one launch.

`pnpm --dir desktop run package` builds installers for the current operating system
in `desktop/release/`. The desktop workflow builds Linux AppImage/deb, Windows
NSIS and macOS dmg/zip artifacts on their respective runners. CI exercises both
the unpacked application and installed deb/NSIS/DMG applications. A manual run
with `signed: true` requires Windows `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` and
macOS `MAC_CSC_LINK`/`MAC_CSC_KEY_PASSWORD`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` repository secrets. It enables
required signing and macOS hardened runtime/notarization, then verifies signatures
and notarization. Regular builds are unsigned development artifacts. These
credentials are not supplied by the repository; successful signed CI runs are
still required before distributing signed releases. Each build emits
`editor-release.json` and `SHA256SUMS.txt` alongside its installers.

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

**Recent Projects** keeps the last twelve folders. Startup reopens the last
project and selected saved level; missing folders produce an error and can be
replaced through Open Project. Unsaved changes still require recovery.
**Save Project As** copies the saved project into an empty folder outside the
source project and switches to the copy. Save or discard pending edits first.
**Project Levels** supports naming, duplication (including per-level bindings),
ordering and confirmed deletion. Saving preserves that order. **Project Files**
filters all managed project files and offers Reveal, Open externally and
Open project in editor. **Project Settings** selects system file associations,
Visual Studio Code, VSCodium or a trusted custom application. VS Code and VSCodium
must be installed and registered for their URI schemes and support traceback
line locations. Custom applications receive a literal file or folder path.

Project layout:

```text
pangea.project.json
.pangea/levels/<custom-id>/   native terrain, textures and per-level Lua bindings
Data/Scripts/                Lua sources, compiled output, definitions and assets
Assets/models/              editable GLB and available native model exports
Assets/sprites/             editable snapshots, native sprites and palette TGAs
Assets/Models/<asset-id>/   generated shared model revisions and native previews
AuthoringSources/          managed Blender, model and image authoring sources
```

## Linked model and sprite sources

In an object's **Appearance**, choose **Project model** to import a shared asset
or reuse an existing one. Import accepts Blender, GLB/glTF and native BG3D/3DMF
models with their skeleton companions. Blender sources require a configured
Blender installation; manually exported GLB remains available without Blender.
The model viewer and object importer use the shared model codec. Geometry edits
saved from the model viewer create a separate asset variant.

Imports copy authoring sources into the project by default. External links are
optional. Managed Blender sources retain packed textures and linked libraries;
glTF resources and native skeleton companions are collected together. Authoring
files have a separate storage budget and are omitted from runtime-only playable exports.
**Save Project As** includes managed authoring files.

The preview is generated from the converted native model and skeleton. Review
reported material, skinning and animation compromises before accepting an import.
Unsupported conversions leave the previous working asset intact. Animation
actions use clip names so reordering clips preserves their meaning; missing or
ambiguous clips require mapping repair. An object can map up to 16 named runtime
actions while retaining all imported clips for selection. Long source names get
short action aliases; action names are limited to 63 UTF-8 bytes by the native format.
Import recipes retain scale, orientation,
the Blender collection selection, named material color/wrapping/blending overrides,
and per-clip animation events. Configure these under **Import settings**, then
**Reimport** to rebuild the native output. The animation event editor shares the
model viewer's named event, sound and flag controls; **Restore source events**
removes the project override for a clip. Missing or ambiguous material/clip names
stop conversion and preserve the working revision until the source names or
settings are repaired. 3DMF supports color overrides while retaining source
wrapping and blending. Some animated transform recipes require
applying the transform in Blender to preserve the rig.

**Open source**, **Reimport**, **Locate moved source**, **Duplicate asset** and
**Undo reimport** manage that shared asset. Compatible source changes rebuild
automatically. Asset identities remain stable across revisions, and Save, Test
and script exports resolve the current model/skeleton pair. Object behavior,
collision settings and individual placement overrides remain independent.

The sprite editor can link a saved Shapes asset to a PNG export, optional
Aseprite JSON frame metadata and its original Aseprite document. Configure a
sprite editor separately from the code editor. **Open source** opens the Aseprite
document when one is linked; export the updated PNG/JSON from that application
to the paths shown under **Export destinations** to rebuild the native sprite.
Managed source copies do not rewrite export paths saved inside an Aseprite
document; choose the linked destinations when exporting. Changes to the Aseprite document alone do not
replace the current native output. **Relink source** repairs moved files while
keeping the source identity and shape assignment.

While the sprite viewer is open, it checks exported files every 2.5 seconds.
Compatible changes update clean documents automatically; drafts pause checking.
Review palette and alpha compromises in the converted native preview before
applying them. **Keep current sprite** dismisses that source revision until a
new export or a manual preview. Frame origins, flags and native animation
commands stay unchanged; transparency becomes the native binary mask. Source
frame names and durations are retained as metadata, without replacing native
animation timing. Imports must retain the selected shape's frame count.

Editable object/library exports offer **Include authoring sources**. They retain
asset identities and import metadata; omitted sources can be located later.
Playable packs default to runtime dependencies only. **Include editable project**
adds editable records; its **Include authoring sources** option also carries
portable model and sprite sources, including linked external files. Imported
records use managed project paths rather than paths on the exporting computer.
Runtime roots retain generated Lua modules, runtime configuration and referenced
assets; Lua authoring sources, LuaLS types, examples and editor documentation
stay in the optional editable project rather than the playable runtime.
Missing linked files fail a source-inclusive export; exporting without sources
keeps native output usable and requires locating/relinking sources before reimport.
Blender source exports require configured Blender to pack linked libraries and
textures. Portable model attachments allow 128 MiB per file and 512 MiB total;
playable packs also have a 512 MiB archive budget. Larger sources can remain in
the local project but must be shared separately.

Lua definitions and source modules are shared within a project. Per-custom-level
bindings stay separate even when two custom levels use the same native slot.
The dedicated Custom Objects page saves project scripts independently, offers
recovery and participates in the same unsaved-edit and external-change guards.
Scripting is enabled by default in desktop builds; browser defaults are unchanged.
Model and sprite editors expose folder assets through **Project Assets** in the
title bar. Opening an existing project asset preserves its directory when saving.
Model saves include GLB and the existing native export formats supported by the
selected game. Mighty Mike GLB files remain editable source models; the native
game uses Shapes rather than 3D models. Sprite pixels, masks, origins, flags and
animation commands are encoded into native RLB `.shapes` output, with editable
state in `.sprite.json`. The native loader obtains its palette from images,
so palette edits also export a separate `.palette.tga`. **Asset Assignments**
selects an installed image target and can replace only its palette, preserving
the original image's dimensions and pixel indices. TGA export encodes current canvas pixels as an
8-bit indexed image with a 24-bit palette. Tileset export writes current tile
pixels while preserving native metadata and original indices for unchanged
colors, and rejects inconsistent edits to aliased tile definitions. Export
rejects out-of-palette colors instead of silently quantizing them. The same
native exporters back the browser's edited-asset download buttons.
Custom-object appearance controls can choose compatible saved project model or
skeleton assets through the same validated upload pipeline. **Asset Assignments**
maps saved native assets to installed game paths for every level or selected
custom levels. Testing and pack export apply these assignments in the separate
runtime snapshot; overlapping targets are rejected. Saving an asset alone does
not choose its runtime use.

Desktop Lua source and object-behavior panels provide a read-only preview and
external-editor actions. Save All materializes helpers, LuaLS settings and types
before opening new files. Clean disk changes reload and compile through the
existing project watcher. The host watches changes with debouncing, caches hashes
for unchanged file metadata and periodically reconciles the tree; a full revision
check still protects every save. Dirty documents offer per-file review across
Lua, configuration and binary assets. Independent text changes merge against
the captured base; overlapping edits require a choice or explicit merged text.
Binary files and deletions offer editor/disk choices. Applying validates the
selected project manifest, checks the revision again, saves atomically and reloads.
Very large text or unavailable baselines require an explicit available version.
Browser Lua editing remains available in Monaco.

Saves are explicit. The desktop host checks the disk revision before saving and
uses a rollback journal for multi-file writes. An interrupted save is restored
when the project reopens. Clean documents reload external edits. Deleting the
selected asset closes its preview, including when disk deletion is accepted in
conflict review; Save cannot recreate the stale asset. Dirty documents
offer a review of additions, changes and deletions before choosing disk or editor
content. Closing a review retains the pending conflict. Unsaved route changes and
window closure are guarded.

Recovery snapshots are written periodically under Electron's user-data directory,
separately from project files. **Recover Unsaved Work** restores a level snapshot;
**Project Assets** offers asset recovery. Recovery does not replace an explicit
save. Git operations are handled by the external editor; there is no built-in Git UI.

## Playable packs and diagnostics

**Playable Packs** exports all saved custom levels to a `.pangeapack` archive with
editable project sources, separate native output for each level, compatibility
versions and SHA-256 hashes. Save pending changes before exporting and choose a
destination outside the project folder, so later exports do not include earlier
generated archives. Packs exclude
installed stock game data and executables. Recipients open the archive, install
or locate the matching compatible game, select a pack level and play. The pack
library persists between launches. Importing creates an editable project in an
empty folder; removing a cached pack leaves the original archive intact.

Each archive includes manual native-launch instructions. Its runtime data overlays
a separate complete game Data directory. A level's arguments select its native
base slot. The level chooser lives in the editor, not in the native game's menus.
Import verifies every declared file, rejects undeclared or unsafe paths and
enforces file/count/extraction limits. Cached files are checked again before use.

**Native Game Console** shows bounded stdout/stderr, launch errors, exit codes
and signals for stock, test and pack runs. Stop terminates the selected process;
Restart snapshot repeats the most recent captured launch, including its staged
files. Project test tracebacks can open the corresponding source at its line in
VS Code/VSCodium when that project remains active. Generated module paths map
to project source; arbitrary native stack traces are not source-mapped.

Project Settings offers an explicit editor update check against stable GitHub
releases and opens a compatible installer's release page. Updating is manual.
An empty or unavailable release catalog is reported; fixture-based tests do not
prove downloads exist. No published releases were available during local validation.

## Optional games and assets

**Games & Downloads** can check releases, choose a version, download a compatible
native game, download Jorio's original stock data, or locate a trusted existing
compatible build. Native games and stock data are independent optional downloads. Installed games
remain available offline. Checking releases and updating are explicit actions;
prereleases require the checkbox.

The compatible-runtime catalog comes from this repository's GitHub releases. A release must
contain `pangea-games.json`, compatible asset-root and Lua contract versions,
runtime packages for all eight games on Linux/Windows/macOS,
and every declared file at its declared size. Each download is verified against
its declared size and SHA-256 before installation. The native release workflow
generates this runtime-only catalog with
`scripts/build_editor_game_catalog.py release-artifacts desktop-artifacts`.
It does not require the frontend's generated stock assets or produce editor packs.
Existing releases without that catalog
are not offered; use **Locate existing** for a compatible local build.

The custom-item pipeline requires editor compatibility epoch 2 and Lua contract
version 2. Older runtime downloads and local executables are rejected; rebuild
or install updated ports before testing these objects. Jorio stock data remains
compatible and does not need to be downloaded again.

Each game's stock-data download uses **Jorio original distribution**. This
downloads stock native data from a pinned official Jorio release, independently
of this repository's releases. The downloader uses the Windows ZIP on every
operating system because its data can be extracted without executing an AppImage
or mounting a DMG. Only native data and attribution files are retained; upstream
executables and libraries are not installed or run. The bundled catalog records
the release, archive size and SHA-256. Updates require a reviewed catalog change
and an explicit download. Cached data remains available offline.

Original data supports stock level browsing and native asset selection and inspection.
Located compatible games also supply their local native data. Home model previews
are converted from their native models and skeletons on demand and cached locally;
source changes invalidate that cache. Fences, water, embedded model textures and
Mighty Mike sprites are decoded from native data through the same loading layer;
original distributions do not need generated editor images.
Older editor packs that were already installed remain usable offline, but are no
longer offered for download. Installing original data replaces that game's previous
data download after successful verification; a failed or cancelled download preserves it. Data downloads do not
register an editor-compatible runtime: testing projects still requires a compatible
build. The source release link and retained upstream license identify the original
distribution and its terms.

Asset resolution chooses one native source per game: an explicitly downloaded
Jorio data installation takes precedence over a located local game. Missing files
produce a typed error; the resolver never fills holes from another installation
or bundled stock copies. Removing the download restores the local game as the
selected source. Project asset URLs remain isolated from stock data.

The canonical stock URL is `game-assets/<GameId>/Data/<native path>`; home previews
use `game-assets/<GameId>/preview/home.glb`. Legacy stock URLs resolve through the
same host service. Native file discovery and direct reads use that service too.
Path lookup handles platform casing and known filename aliases, rejects ambiguous
case matches and symlinks, and notices directory additions and removals.

Home conversions use immutable input snapshots, content hashes and a versioned
conversion recipe. The host deduplicates concurrent conversions, limits conversion
concurrency to two, writes outputs atomically and verifies cached output hashes.
Damaged or incomplete cache entries are rebuilt; timestamp-only changes do not
force a rebuild. Source changes clear the renderer's bounded byte, image, model
and sprite caches together. Late results from an older source are discarded.

Loading failures appear in an application alert with **Retry asset loading** and
**Manage game data**. **Reload game assets** also clears the renderer caches after
files in a local Data folder are edited externally. Filesystem changes do not
automatically refresh an already rendered scene. Stock levels publish their data
only after their required texture companions have loaded successfully.

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
pnpm --dir desktop run check
pnpm --dir desktop run test
pnpm --dir frontend exec vitest run --coverage.enabled=false src/platform/desktop
pnpm --dir desktop run build
pnpm --dir desktop run test:e2e
python3 scripts/test_editor_game_catalog.py
python3 scripts/test_native_packages.py
```

The desktop suite includes:

- Filesystem integration tests for multi-file saves, rollback after injected disk
  failures, crash journal replay, invalid journals, concurrent saves, stale
  revisions, recovery retention, binary data, and file-size limits.
- Request-schema and protocol tests for malformed messages, unsafe paths, renderer
  and project assets, optional installed assets, response headers, and HEAD requests.
  Protocol unit tests mock Electron's registration and file-fetch boundary.
  Main-process tests invoke the actual registered IPC handler and verify owning
  window/main-frame identity, origin validation, dirty guards, and denied permissions.
  Preload tests verify fixed event channels, payload isolation, and listener cleanup.
- Download and installation tests for release filtering, contract compatibility,
  checksums, truncated downloads, HTTP failures, cancellation, concurrent installs,
  retry and cleanup, archive traversal, offline registries, and asset ownership.
  Network replies are fixtures; these tests do not verify live GitHub releases.
  Jorio stock-data tests also cover pinned upstream metadata, data-only extraction,
  attribution, cancellation, failed-update preservation and native asset access
  without a game executable. Native URL resolution tests cover platform casing,
  resource companions, known upstream filename differences and ambiguous paths.
  Source-consistency tests ensure protocol requests and native reads select the
  same installation and never fill missing files from another source. Conversion
  tests cover concurrent requests, bounded workers, immutable snapshots,
  same-size content edits, recipe versions, damaged output and retry after failure.
  Native fixtures exercise all seven animated home previews and every supported
  fence and liquid mapping. Renderer tests cover explicit revision dependencies,
  bounded caches, stale results, worker cancellation and atomic stock-level loads.
  To verify actual upstream archives, place the pinned ZIPs in a local directory
  and run `PANGEA_UPSTREAM_ARCHIVES=/absolute/cache pnpm --dir desktop exec vitest run --config vitest.config.ts tests/upstreamData.test.ts`.
  Those eight opt-in cases check the pinned hashes and exercise the production
  download/extraction path; normal CI uses small network fixtures.
  Runtime lifecycle tests verify that updates/removal remain blocked until every
  running instance exits, including when another launch fails.
- Headless process tests for literal argument handling, diagnostic limits, exit
  status, missing executables, and timeouts. Game staging substitutes a Node process
  for the native game and verifies installed data is preserved.
- Renderer tests for validated bridge responses, disconnections, external-change
  routing, save failure and retry, edits during a save, duplicate save prevention,
  and clean-state tracking while a saved level loads. A real codec round-trip test
  verifies that blank levels preserve required zero-length resources when saved
  and reopened. Sprite project tests preserve edited pixels, masks, offsets,
  animation commands and palettes, verify native output, and reject invalid snapshots.
  Real bundled Shapes fixtures round-trip through the native encoder and parser.
  Deferred level/model/sprite loads verify stale completions cannot overwrite a
  newer document or survive Clear, project changes, and unmounts. Native indexed
  TGA exports reopen through the actual image decoder with their palette intact.
  Project management tests cover file duplication, shared-file retention, ordering,
  per-file Lua merging, recent-project persistence, Save As and external-open boundaries.
- Real Electron E2E tests for sandbox settings, title-bar menus, project creation,
  native level serialization, save/reopen, custom-level switching, external-edit
  conflict review and deletion, folder-selection cancellation, malformed IPC, and
  dirty-project replacement and close guards. Download prompt tests open the real
  missing-assets dialog and cover empty/offline catalogs, asset install/remove,
  cancellation, and retry after checksum failure through real IPC and host services.
  Project-management E2E checks level naming, duplication, ordering, deletion,
  file browsing, Save As and selected-level restoration. An external-editor E2E
  check verifies read-only source UI and clean Lua reloads without mounting Monaco.
  Recovery testing restarts Electron with the same isolated profile, opens the saved
  project, restores the periodic snapshot, and saves the recovered base-level setting.
  Asset lifecycle testing opens, saves and reopens an indexed TGA in the real
  sprite viewer, checks rendered pixels, accepts external deletion, and verifies
  Save leaves the file deleted.
  The custom-item workflow imports an animated model, shares it between two
  definitions, places it through the production Konva canvas, edits a placement
  override, reimports a changed source, restarts the app, and imports an editable
  object bundle into a fresh project. Separate real-Otto engine checks exercise
  the generated starter controllers and native actor variants using production
  asset assignment and package generation, including physical skeleton resources.
  New workflow checks stream and stop/restart a real headless Node process standing
  in for a game, merge mixed Lua/configuration/binary changes, assign a native TGA
  palette while retaining image indices, export/open/import a playable pack, and
  configure an external editor with open-at-line dispatch. External application
  launching and release responses use fixtures; these checks do not verify
  published game packages or real external editor installations.

On Linux, use `PANGEA_ELECTRON_HEADLESS=1 pnpm --dir desktop run test:e2e` to run
Electron with Chromium's headless platform and no visible windows. CI runs the
Electron suite against both the source app and packaged executable under Xvfb on
Linux and natively on Windows/macOS, and retains failure traces in separate
`desktop/test-results/source/` and `desktop/test-results/packaged/` directories.
Each E2E case has an isolated profile and project directory;
fixture cleanup waits for Electron to exit. Games UI stories mount the production
component with installed and offline states.
Project-management and workflow stories mount the production level manager, file
browser, source preview, console, asset assignments, pack library, conflict review,
and editor settings. Linux CI runs their interaction tests. The Mighty Mike generated-runtime launch regression
uses edited Shapes bytes from the production encoder for its custom asset.

After packaging, run `PANGEA_ELECTRON_PACKAGED=1 PANGEA_ELECTRON_HEADLESS=1 pnpm --dir desktop run test:e2e`
on Linux to test the built application bundle. The fixture finds the platform's
unpacked executable and verifies `app.isPackaged`; a missing package fails the test.
Set `PANGEA_ELECTRON_EXECUTABLE` to override its path. This exercises the packaged
ASAR, preload, and renderer resources; it does not install a deb/NSIS/dmg or mount
an AppImage. Without the headless option, the Electron tests open desktop windows.
Type checks, service tests, and renderer unit/integration tests do not open app
windows. CI also installs the deb/NSIS/DMG and reruns the Electron suite against
that installed application. Windows/macOS installers and signing/notarization need
their respective runners and credentials; local Linux checks do not verify them.
Live published release downloads and native gameplay require separate validation.
