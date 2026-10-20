# Lua scripting editor assessment

Reviewed 19 October 2026 against the supplied Custom Objects and Scripts /
Assignments screenshots, production source, generated contract, native shared
tests, and direct workspace-generation probes. This is an assessment and
implementation brief. The findings below describe the original revision;
the implementation status records the subsequent redesign.

## Redesign implementation status

The production workbench now shares one object library/inspector between the
standalone page and level editor. New object creates definition and Lua source
together; blank behavior is the default and Hover Beacon is an optional sample.
Appearance, inline behavior/lifecycle editing, collision and cross-level instance
usage have focused sections with direct edit/place/select actions. Native global
models have named choices and an automatic real asset preview with cached list
thumbnails. Upload formats,
default paths and skeleton/animation controls follow the selected game.

Level events show active handlers and searchable grouped events; Lua source and
test/export are separate workbench sections. Samples have an explicit replacement
warning and session undo. The nonfunctional parameter metadata form is removed.
Bundle generation no longer claims to establish valid runtime behavior.

The four correctness findings below have implementation fixes: aligned sample
exports, contract-derived hooks/wrappers (including dialogue and damage result
routing), empty new-level state and per-level dispatch/spawns, and physical
skeleton paths plus recursively required helper collection in object bundles.
Imports validate source/asset paths and definition references. Gameplay mutations
must still stay in callbacks because all modules evaluate during entry loading.

Code discovery now has a visible API reference section and a reference beside
source/object behavior, with namespace search, parameter descriptions, hook
contexts/returns, object methods and inherited types from the LuaLS declaration
generator. Fallback hook snippets use the source's exported table.
The Learn section now presents the full repository guides by chapter. Manual
downloads and IDE exports include those guides plus a generated complete API
reference. Cross-game discovery is opt-in and marks unsupported entries. The
examples demonstrate runtime capability/action/state-field discovery rather
than assuming that the static contract accepts every operation in every mode.
LuaLS assistance now retains completion placeholders, replacement/import edits
and lazy documentation resolution, and provides inferred signature help. The
browser and IDE share Lua 5.4 module configuration. Contract hover help remains
available offline; connection failures show their reason and a reconnect action.
Native LuaLS process replies use persistent hub context so hub disposal does
not silently break the language-server connection. A real LuaLS process and
the browser/backend connection were checked in addition to protocol tests.

Shared-library export now produces a Git/IDE-friendly Lua project with editable
definition metadata, a JSON schema and LuaLS configuration. Shared-library and
Lua-folder imports review additions/conflicts before merging; level assignments,
native bindings/replacements and placements are preserved. Full script-package
import is explicitly a workspace restore. The production page story covers
library import followed by an IDE source update, conflict selection and editing
the accepted source. This remains snapshot import, without live disk sync,
three-way merging, dependency pinning or multiple named pack workspaces.

Remaining scope includes a live object/ownership/scheduler/budget inspector,
collision geometry visualization, animated custom asset inspection, explicit
per-instance parameter semantics, and full native gameplay coverage of every
asset/mode. Literal helper collection cannot discover computed requires; use full
script packages for those sources. The current workflow and limitations are in
[the editor guide](../games/pangea-ports/docs/scripting-editor.md).

### Redesign verification

- Frontend TypeScript project build, targeted ESLint, contract consistency,
  and all eight staged scripting-artifact checks pass.
- Focused workspace/definition/dialogue/package/preview suites: 75 tests pass.
- Production page, level-menu and export-panel Storybook interactions: 15 tests
  pass. Real browser checks cover library/game isolation, object placement/editing,
  inline source diagnostics, package exports, preview launch and error reporting.
- Executing a generated two-level bundle with the pinned Lua interpreter verifies
  isolated assignment/placement routing, object updates, dialogue result dispatch,
  and returned damage policy. That probe stubs native commands; it does not prove
  native geometry or physics.
- Actual mapped model loading was inspected in the live inspector. At 390px,
  the object workspace has no horizontal overflow; desktop/mobile screenshots
  were inspected. This is distinct from every asset format being runtime tested.
- Otto and Mighty Mike preview launch and Lua traceback checks pass. Nanosaur
  currently fails during graphics startup with `Cannot read properties of
  undefined (reading 'createTexture')`, before its scripting host initializes.
  Its editor validation/export checks pass, but native scripted preview is blocked.
- The existing scripted/native lifecycle-parity check compares trace counts at
  different wall-clock moments; it still reports count differences on Otto.
  It is retained as a failing broader runtime check, not described as covered by
  the passing editor workflow checks.

## Original finding

The UI understates a substantial runtime and sometimes misrepresents what is
connected. The main problem is the incomplete path from **create → configure →
place → edit behavior → validate → play → export**. More controls alone would
not repair that path. Correct dispatch, scope and package behavior need to
precede a larger visual redesign.

The runtime has 13 object lifecycle events, native player operations,
controller/rule ownership, input/state discovery, world queries, scheduler,
scalar persistence, branching dialogue, HUD/audio/effects, validated custom
assets and diagnostic traces. The current interface emphasizes empty hook
rows, template selection and metadata forms, with little connection between
an object, its code, its native assets, its instances and its runtime result.

Runtime details and limitations are documented in
[the Lua guide](../games/pangea-ports/docs/lua-scripting.md). Current UI behavior
is documented in [the editor guide](../games/pangea-ports/docs/scripting-editor.md).

## Correctness findings to address first

### 1. Default object creation can lose its lifecycle behavior — high

**Confirmed by a workspace-generation probe.** Starting with a fresh Nanosaur
workspace, call `createCustomObjectFromBehavior` with `sample.hover-beacon`
and `custom.hover-beacon`. The definition expects `customHoverBeacon`, but its
materialized source exports `sampleHoverBeacon`. Generated routing reads the
former; the behavior is therefore absent. `compileScriptWorkspace` still
reports "Compile completed successfully".

Evidence: [creation and generator](../frontend/src/editor/subviews/scripts/scriptWorkspaceStateRuntime.ts)
(`createCustomObjectFromBehavior`, `buildBehaviorCatalog`,
`buildGeneratedEntryModule`), [template materializer](../frontend/src/editor/subviews/scripts/scriptCustomObjectTemplate.ts).
The materializer replaces the new export placeholder, while the built-in
Hover Beacon template retains a literal export. The sample loader's existing
fixtures do not establish the fresh **Save Object** path.

Acceptance: creating a default object and a user-authored object must produce
matching definition/source/entry exports and invoke spawn/update in the native
runtime. Missing exports must be actionable validation errors.

### 2. Supported runtime callbacks are absent from editor dispatch — high

**Confirmed by comparing the current context with the authoritative API.**
`createScriptWorkspaceContext` uses hand-maintained hook lists;
`buildGeneratedEntryModule` emits wrappers only for those lists.

| Game | Native contract hooks | Editor context hooks |
| --- | ---: | ---: |
| Otto Matic | 22 | 11 |
| Bugdom | 23 | 11 |
| Bugdom 2 | 23 | 11 |
| Nanosaur | 18 | 10 |
| Nanosaur 2 | 25 | 11 |
| Cro-Mag Rally | 19 | 13 |
| Billy Frontier | 20 | 11 |
| Mighty Mike | 20 | 10 |

Every editor list omits `onDialogueResult`, game start/shutdown, damage and
player lifecycle callbacks. Some additionally omit save/load, checkpoints or
progression. Cro-Mag's editor list includes `onWeaponHit` and
`onObjectiveComplete`, which its native hook contract does not advertise.

This is more than a discoverability gap: a source module can define a valid
callback that the generated entry never forwards. The dialogue generator
already writes `onDialogueResult`, so its result handling is disconnected by
this omission.

Evidence: [context/entry generator](../frontend/src/editor/subviews/scripts/scriptWorkspaceStateRuntime.ts),
[API schema](../frontend/src/editor/subviews/scripts/scriptApiSchema.ts),
[native mirror](../games/pangea-ports/shared/script/pangea_script_contract.h),
[dialogue source](../frontend/src/editor/subviews/scripts/scriptDialogueAuthoring.ts).

Acceptance: derive editor hook availability and entry routing from the same
validated per-game contract; exercise dialogue choice results, damage,
save/load and mode-specific hooks through generated bundles. Do not expose
unsupported Cro-Mag callbacks as usable assignments.

### 3. Level scope and shared module execution disagree — high

**Confirmed:** assigning `sample.log-level-start` on level 0, storing the
workspace, then opening unseen level 1 copies that assignment. Replacements
are copied by the same `retargetScriptWorkspace` path; placements are cleared.
The interface does not explain this implicit inheritance.

**Static execution risk:** the generated dispatcher builds `__modules` from
game-wide `moduleOrder`, rather than the current level's assignment allowlist.
Every stored numeric level points at the same active-context `dist/main.lua`.
Stored per-level rows therefore do not establish isolated execution per level;
a multi-level export may run the active context's placements/handlers elsewhere.

Evidence: [retargeting and generation](../frontend/src/editor/subviews/scripts/scriptWorkspaceStateRuntime.ts)
(`retargetScriptWorkspace`, `buildGeneratedEntryModule`, `buildRuntimeLevelsJson`).

Acceptance: define explicit game-wide versus level-local execution, default
new levels intentionally, and generate/route each level's handlers and spawns
accordingly. Verify two levels with different hooks and placements after
switching, reloading and exporting/importing. Offer copying as an explicit
action if desired.

### 4. Definition export is incomplete for skeletal/helper-based objects — high

**Confirmed bundle-path failure:** a workspace with a definition referencing
`beacon.skeleton` and an asset stored at the correct physical
`beacon.skeleton.rsrc` path fails definition export with:
`Definition asset is missing: Data/Scripts/assets/skeletons/beacon.skeleton`.
This probe tests enumeration, using placeholder bytes; it does not claim the
placeholder model/resource was a valid native asset.

**Static dependency gap:** the bundle collects only each definition's direct
source and visual assets. Shared helper modules required by that source are
not traversed. Imported definitions may therefore lack code they need.

Evidence: [definition bundles](../frontend/src/editor/subviews/scripts/scriptDefinitionBundle.ts),
[physical asset paths](../frontend/src/editor/subviews/scripts/scriptAssetPaths.ts).
Existing bundle tests cover a simple sample round-trip and wrong-game rejection,
not skeleton resources or transitive helper modules.

Acceptance: export the required source/asset dependency closure, use physical
resource paths, and test import in a fresh same-game workspace with a real
skeletal fixture and shared helper. Do not conflate definition bundles with
the fuller script-package builder.

## Capability and workflow comparison

| Surface | Useful current behavior | Why it feels inadequate | Recommended change |
| --- | --- | --- | --- |
| Custom Objects | Game scope, create definition, native/custom visual, collision, bundle actions | Empty space and two-stage script/definition creation; no integrated code/preview/usage | Selectable library with a focused definition inspector and create-to-place flow |
| Overview | Counts, sample loader, searchable hook/API explorer | Counts do not show readiness; samples replace a game workspace; reference lacks task context | Guided tasks, explicit scope and validation summary, safe sample import |
| Assignments | Global rows, object-type behaviors, native selected-item binding/replacement, instance list | Long unassigned hook list; game library and level edits mixed together; limited instance editing | Grouped active assignments and context inspector; share the library instead of duplicating its creation form |
| Code | Real Monaco, files, generated/runtime views, LuaLS integration, dialogue authoring | Modal disconnects code from object/selection; successful compile overstates checking | Integrated source editor with context/event/result reference and truthful validation stages |
| Preview and Export | Real WASM path, scripted/native comparison, package choices, warnings | No per-object runtime state, budgets, ownership or event history | Preview with diagnostics tied to definition, instance, source and active level |

### Custom Objects: give a definition a working identity

The screenshot correctly distinguishes game definitions from level instances,
but then leaves the user with a behavior selector, generated ID, name and
**Save Object**. **Create Custom Object Script** opens another workflow,
without a direct edit/test action on the resulting object.

After creation, the former `ScriptCustomObjectsPanel.tsx`
adds fields, but it still exposes raw model/skeleton indices rather than named
asset choices or previews. Custom model controls say **Custom BG3D** for
Bugdom/Nanosaur, and their default model paths use `.bg3d`, despite those games
requiring 3DMF. The custom skeleton has an animation selector but no structured
animation-name mapping editor; the current form also lacks scale editing for
custom skeletons and initial animation selection for native skeletons.

Provide a library list with game, asset type, script, collision, validation and
usage. Selecting a definition should expose focused Appearance, Behavior,
Collision and Usage views, backed by actual data. Offer named native assets
with thumbnails and level dependencies, supported file formats, model preview,
animation mapping/playback and collision bounds visualization. Show visible
model errors before preview. Keep IDs available for reference but do not
present an opaque numeric index as the main asset-selection workflow.

Provide **Edit behavior**, **Place in current level**, **Find instances** and
**Test** actions. Preserve the distinction between template and materialized
source; offer clone/update choices explicitly. Add rename/duplicate/delete
with reference handling rather than silently orphaning instances.

### Assignments: organize by user intent and selected context

The screenshot devotes most of the page to unassigned global events while
definition creation and Parameter Registry compete for the right column.
The user needs to answer "what runs on this level or selected object?".

Show active assignments first, then grouped lifecycle, spawning, interaction,
combat, progression and save/load hooks with an **Add event** action. Give each
assignment an edit-source action, valid return examples and clear scope.
Keep selection visible across Items/Splines/Scripts navigation, with a route
back to the bound item and a warning when its signature changes.

Show instances with definition, position, validation and **Select on map**.
Rotation, scale and parameter overrides need schema/runtime work before adding
controls; they cannot be shipped as UI-only fields.

Parameter Registry currently stores string defaults and has no runtime value
resolver in generation. A generic `editor.speed` form therefore promises little
usable behavior. First define parameter ownership, lookup and override rules;
then provide named boolean controls, bounded numbers, enums and structured
collections according to a schema. Keep native item bytes, reusable behavior
parameters and level settings distinct in both storage and explanation.

### Overview and Code: make reference usable while authoring

The hook/API explorer is a useful existing feature; extend it rather than
inventing a second catalog. Show context members, example result tables,
game/mode availability and related operations alongside the selected callback.
Support all 13 object lifecycle methods and explain cleanup/state retention.

Samples currently replace all game workspace state after a single Load click;
the warning is hidden in a tooltip. Offer add-as-new, inspect or explicit replace
with a recoverable snapshot. For area/race games, first-script guidance must
use the actual start callback rather than recommending `onLevelStart`.

Keep files, object/event selection, code and diagnostics in one editing view.
Make source locations in diagnostics navigable. Label checks separately:
**source saved**, **bundle generated**, **LuaLS checked/unavailable**,
**package valid**, **runtime loaded**, **behavior observed**. The current
compile path copies source and does not validate Lua exports or fully parse it.

### Preview and Export: show evidence, not a compatibility badge

Connect runtime diagnostics to the active game/level and selected instance:
live handle/generation, visual, controller ownership, latest event/operation
failure, script memory, budgets, timers/tasks/subscriptions and command trace.
Inspect these through existing diagnostics plus any narrowly needed bridge.
Keep original-compatible omission explicit and preview/export validation aligned.

Use distinct actions/descriptions for definition reuse, complete script
round-trip and playable extended level packages. A `preview-ready` template
label should not imply that its configured native assets and Lua exports have
passed a runtime test.

## Suggested implementation order and acceptance

1. Fix export names, contract-driven routing, level isolation and bundle
   dependency/resource paths. Add behavioral coverage for the probes above.
2. Define parameter value semantics and truthful validation states; constrain
   visuals and asset selection per adapter. Preserve existing native fallback.
3. Build one reusable definition inspector and contextual level assignment
   view, with direct edit/place/find/test actions. Keep components focused;
   `ScriptsMenu.tsx` and workspace runtime currently concentrate many concerns.
4. Add runtime inspection and comprehensive production-UI stories for empty,
   populated, invalid asset, unsupported mode, missing LuaLS, multiple levels,
   narrow viewport and import/export failure states.

The end-to-end acceptance task should be: create an object from a fresh
workspace, choose a valid named/previewed asset, add spawn/update/trigger
behavior, place two instances, change one supported value, preview in the real
game, follow an error back to source, export and reimport into a fresh workspace,
then verify another level remains independent. Include Nanosaur/3DMF,
Otto/BG3D+skeleton and Mighty Mike/2D coverage.

Existing stories mount production components, which is valuable. However,
the former `ScriptCustomObjectsPanel.stories.tsx`
has no-op create/upload/export callbacks, and
[the page story](../frontend/src/pages/CustomObjectsPage.stories.tsx) exercises
game switching/dialog opening. Those are not coverage of the full acceptance
flow. Fix fixture/provider boundaries and exercise the real implementation;
do not replace it with lookalike controls.

## Verification and limits

- `pnpm --dir frontend run check:scripting-contract`: passed.
- Fresh standalone shared-runtime CMake build and CTest: 14/14 passed,
  including all eight game sample fixtures.
- Focused workspace scope, definition bundle, dialogue authoring, preview/export
  and package validation suites: 5 files, 14 tests passed.
- All nine Lua documentation blocks parsed with the pinned Lua 5.4.6 compiler;
  the JSON example parsed, documentation links resolved, and local skill
  validation passed. Syntax checks do not establish native gameplay semantics.
- Direct TypeScript probes confirmed the export mismatch, successful compile
  despite it, new-level assignment copying and skeletal bundle path failure.
- Visual conclusions use the supplied screenshots and production source.
  This review does not claim new live browser interaction or visual regression
  coverage, nor complete gameplay coverage across every native mode.

These passing checks explain why broader workflow coverage is needed: contract
consistency and shared native tests do not currently verify the editor's full
create/place/dispatch/export path.
