import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { buildScriptDocumentationFiles } from "./scriptDocumentation";
import { buildLuaLsConfig } from "./scriptLuaLsConfig";

export const SCRIPT_IDE_README_PATH = "README.md";
export const SCRIPT_IDE_CONFIG_PATH = ".luarc.json";
export const SCRIPT_IDE_EXAMPLE_PATH = "Data/Scripts/examples/hello.lua";

export const SCRIPT_IDE_SUPPORT_PATHS = [
  SCRIPT_IDE_README_PATH,
  SCRIPT_IDE_CONFIG_PATH,
  SCRIPT_IDE_EXAMPLE_PATH,
] as const;

function buildIdeReadme(state: ScriptWorkspaceState): string {
  const level = state.context.levelNumber === null
    ? "the current level"
    : `level ${String(state.context.levelNumber)}`;
  return `# ${state.context.gameLabel} Lua scripts

This package was exported from PangeaRSEdit for ${level}.

## Edit in an IDE

1. Open this folder in VS Code or another Lua-aware editor.
2. Install LuaLS (the Lua Language Server) or a compatible Lua extension.
3. Edit files under \`Data/Scripts/src/\`.
4. Return to PangeaRSEdit and open **Shared libraries and IDE workflow**.
5. Choose **Update Lua folder**, selecting this project root or its src folder.
6. Review additions/conflicts, then apply selected changes. Level-specific
   assignments, bindings, replacements and placements remain intact.
7. Build the bundle, review diagnostics, and test it in the game.

New Lua files are discovered by the folder update. Generated main.lua, dist,
types and configuration are excluded. Missing files do not delete editor work.
The browser imports an explicit snapshot; it does not watch or write this folder.

## Share a common base across a level pack

Use **Export shared library** for objects, reusable behavior metadata, helper
Lua, parameters and assets. Unzip it into a Git repository and open that root
in your IDE. The editable library.json describes definitions and behavior
metadata; keep IDs/source export names stable when updating existing objects.
Rezip with library.json at the root and choose **Import shared library**.
Review conflicts before applying. This merge preserves level-specific work.
Do not import a full workspace backup to update a shared library.

A complete **script package** is a workspace backup containing all stored
levels. **Import script package** replaces this game's scripting workspace.
Its generated manifest/hashes are validated; use Lua-folder updates for edited
source rather than repackaging a stale generated workspace backup.

The generated declarations in \`Data/Scripts/types/\` provide completion and
documentation for this game. The root \`.luarc.json\` configures LuaLS to load
them automatically.

## Package layout

- \`Data/Scripts/src/\`: editable Lua source files.
- \`Data/Scripts/types/\`: generated LuaLS declarations; regenerate by
  exporting the package again after changing the game or level.
- \`Data/Scripts/config/\`: editor-generated bindings, placements, parameters,
  and runtime configuration.
- \`Data/Scripts/dist/\`: compiled bundle output; do not edit this directory
  directly.
- \`Data/Scripts/assets/\`: validated custom runtime assets.
- \`Data/Scripts/examples/hello.lua\`: a minimal level-hook starter example.

## Runtime notes

- Scripts use Lua 5.4 and \`local pangea = require("pangea")\`.
- Object handles are opaque and generation-checked. Test them with
  \`pangea.object.exists(handle)\` before using a retained handle.
- Check \`pangea.api.capabilities()\` before relying on an optional feature.
- Script persistence is local to the runtime; this package does not enable
  multiplayer synchronization.
- The editor validates package paths, schemas, assets, hooks, and native IDs
  when the ZIP is uploaded.

The editor's **API reference** and bundled LuaLS declarations document the API.

## Learn the full API offline

Start at [the complete API reference](Data/Scripts/docs/API.md), then read
[working examples](Data/Scripts/docs/script-examples.md) and the
[runtime guide](Data/Scripts/docs/scripting-runtime.md). The docs folder also
contains gameplay/presentation semantics, per-game restrictions, configuration,
and the shared-library workflow. The API reference includes every function/hook
and marks whether it is advertised for ${state.context.gameLabel}.
`;
}

function buildStarterExample(state: ScriptWorkspaceState): string {
  const hook = state.context.supportedHooks.includes("onLevelStart") ? "onLevelStart"
    : state.context.supportedHooks.includes("onAreaStart") ? "onAreaStart" : "onRaceStart";
  return `local pangea = require("pangea")
local entry = {}

---@param ctx LevelContext
function entry.${hook}(ctx)
  pangea.log.info("Hello from " .. (ctx.levelName or "the current level"))
end

return entry
`;
}

export function buildScriptIdeSupportFiles(
  state: ScriptWorkspaceState,
): readonly { readonly path: string; readonly bytes: Uint8Array }[] {
  return [
    { path: SCRIPT_IDE_README_PATH, bytes: strToU8(buildIdeReadme(state)) },
    { path: SCRIPT_IDE_CONFIG_PATH, bytes: strToU8(buildLuaLsConfig()) },
    { path: SCRIPT_IDE_EXAMPLE_PATH, bytes: strToU8(buildStarterExample(state)) },
    ...buildScriptDocumentationFiles(state),
  ];
}
