---
name: pangea-lua
description: Reference and modify Pangea Ports Lua scripting, native adapters, script packages, custom objects, and the PangeaRSEdit scripting UI. Use for Lua authoring, runtime/editor contract questions, asset packaging, and scripting workflow reviews in this repository.
---

# Pangea Ports Lua scripting

This repository embeds Lua 5.4.6 through a shared C runtime and eight native
game adapters. Production scripts are Lua modules returning callback tables.
This skill is stored in the repository so it can be reviewed and committed
with the implementation; it does not require a personal skill installation.

Resolve paths below from the repository root. Do not use an installed copy of
another checkout as evidence for this one.

## Read only the relevant guide

- Start with `games/pangea-ports/docs/lua-scripting.md` for the documentation map
  and generated API reference.
- For callback execution, object state/lifetime, scheduling, sandbox, budgets,
  ownership or diagnostics: `games/pangea-ports/docs/scripting-runtime.md`.
- For config, assets, source/runtime output, import/export or scopes:
  `games/pangea-ports/docs/script-config.md`.
- For examples: `games/pangea-ports/docs/script-examples.md`.
- For shared pack libraries, IDE source updates, import conflicts and backup
  boundaries: `games/pangea-ports/docs/script-library-workflow.md`.
- For game/mode differences: `games/pangea-ports/docs/script-game-matrix.md`
  and the gameplay/presentation sections in `lua-scripting.md`.
- For editor tasks: `games/pangea-ports/docs/scripting-editor.md`; read
  `docs/scripting-editor-review.md` for known gaps and proposed work. Findings
  describe the reviewed revision, not permanent requirements or shipped fixes.

## Establish the implementation boundary

Identify the exact game ID, native mode, level, item surface, and whether the
task concerns runtime behavior, editor authoring or package round-trip.
Separate a behavior template, a game-wide definition, a level placement, a
native source binding, and a native replacement; they are different records.

Use these sources together:

| Concern | Source |
| --- | --- |
| APIs, hooks, result/command metadata | `frontend/src/editor/subviews/scripts/scriptContract.ts`, `scriptApiSchema.ts`, `scriptGameplayApi.ts`, `scriptPlayerOperations.ts`, `scriptPresentationApi.ts` |
| C mirror of the contract | `games/pangea-ports/shared/script/pangea_script_contract.h` |
| Host/config/handles/lifecycle | `games/pangea-ports/shared/script/pangea_script.c`, `pangea_script.h`, `pangea_script_config.c` |
| Lua bindings/sandbox/scheduler | `games/pangea-ports/shared/script/pangea_script_backend_lua.c` |
| Native implementation | `games/pangea-ports/games/<game>/src/Scripting/` or `Source/Scripting/`, plus real engine call sites |
| Current workspace/schema/dispatcher | `frontend/src/editor/subviews/scripts/scriptWorkspaceStateRuntime.ts`, `scriptWorkspaceStateTypes.ts` |
| Shared object inspector and level workflow | `CustomObjectWorkspace.tsx`, `ScriptsMenu.tsx`, `ScriptLevelEvents.tsx`, `ScriptSourceWorkspace.tsx` in that frontend directory |
| Level dispatch and object authoring | `scriptLevelRouting.ts`, `scriptObjectActions.ts`, `scriptObjectHandlers.ts` in that frontend directory |
| Packages/assets | `scriptPackageValidator.ts`, `scriptDefinitionBundle.ts`, `scriptAssetPaths.ts`, `scriptAssetValidation.ts`, `scriptPreviewExportActions.ts` in the same frontend directory |
| Shared libraries and IDE updates | `scriptLibrary.ts`, `scriptLibraryMerge.ts`, `scriptIdeFolder.ts`, `ScriptLibraryTools.tsx`, `scriptIdePackage.ts` in the same frontend directory |
| Lua intelligence | `scriptMonaco.ts`, `scriptLspClient.ts`, `scriptTypeDeclarations.ts`, and `backend/PangeaRSEdit.Api/Hubs/LspHub.cs` |
| Completion protocol and shared LuaLS settings | `scriptLspSchemas.ts`, `scriptLspMapping.ts`, `scriptLuaLsConfig.ts`, `scriptApiAssistance.ts` in the frontend scripting directory |
| Learning guides and offline API manual | `scriptGuides.ts`, `ScriptLearningGuides.tsx`, `scriptFullApiReference.ts`, `scriptDocumentation.ts` in the frontend scripting directory |

Do not use planning documents, the historical `shared/script-types` package,
or `scriptSidecarState.ts` as the authoritative current editor/runtime schema.
Trace a contract entry to its binding, adapter and native dispatch site before
claiming support. Capability flags may still reject a particular actor/mode.

## Preserve scripting semantics

- Return an entry table and keep native mutations in callbacks; staged reload
  guards module-evaluation side effects. Runtime modules resolve from
  `Data/Scripts/dist/modules/` and `dist/`.
- Treat callback contexts as read-only. Player indices are zero-based; Lua
  parameter arrays are one-based. Mutate through supported commands/results.
- Match definition ID, exact Lua `exportName`, source export and generated entry
  route. `self` is a transient wrapper; use `pangea.object.state(handle)` for
  instance state. Observe lifecycle cleanup and generation invalidation.
- Distinguish controller ownership from rule ownership, collision presets from
  full native mechanics, and attachment transforms from inventory relationships.
- Use the selected adapter's model format: BG3D, Bugdom/Nanosaur 3DMF, or
  Mighty Mike Shapes. Skeleton logical paths end in `.skeleton`; physical
  resource bytes end in `.skeleton.rsrc`.
- Inspect runtime `capabilities`, player actions/state fields and collision
  categories. Check structured operation results. Package hashes do not enable
  network scripting; the host gates networked simulation scripts off.
- Check what the current generator actually consumes. Parameter sidecars,
  assigned-hook rows and `preview-ready` labels do not prove runtime behavior.
- Keep learning material available inside the API reference and in exported
  IDE documentation. Derive function/hook/type catalogs from the contract and
  LuaLS generator; teach lifecycle, ownership and operation results through
  examples. Distinguish full cross-game discovery from selected-game support.
- Verify LuaLS assistance through the backend transport as well as generated
  declarations. Preserve completion resolution data, snippets and edits; use
  persistent hub context for process replies after hub invocations end. Add
  LuaDoc context/self annotations to generated callbacks so field completion
  works without users first discovering the types in documentation.
- Distinguish shared-library merges and source-only IDE snapshots from full
  workspace restore. Preserve level records when updating a shared base; review
  conflicts, retain stable IDs and keep definition/source exports aligned. File
  omission is not a deletion. Do not claim folder watching or disk write-back.
- Keep generated metadata synchronized through existing generators and inspect
  their output before applying it. Preserve the generated reference markers.

For editor changes, use actual production components and realistic game data
in Storybook. A form render does not prove a create/place/preview/export flow.
Keep recommendations distinct from implemented behavior and confirmed defects
distinct from static risks. Respect repository source boundaries in AGENTS.md.

## Verify the affected boundary

From the repository root, run the existing contract consistency check when
changing contracts, generated metadata or their documentation:

```sh
pnpm --dir frontend run check:scripting-contract
```

For shared native behavior:

```sh
cmake -S games/pangea-ports/shared/script -B .tmp/pangea-script-check -DBUILD_TESTING=ON
cmake --build .tmp/pangea-script-check -j 4
ctest --test-dir .tmp/pangea-script-check --output-on-failure
```

Run relevant existing frontend tests directly with `pnpm --dir frontend exec
vitest run <test-paths> --coverage.enabled=false`; the generic test lifecycle
also builds WASM. Add meaningful coverage for changed behavior as needed.
For native assets or adapter changes, verify with the selected real generated
runtime and relevant level/mode. Shared stub tests and metadata checks cannot
establish that coverage. Report concrete prerequisites when preview is blocked.
