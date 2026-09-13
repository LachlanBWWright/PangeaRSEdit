import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export const SCRIPT_IDE_README_PATH = "README.md";
export const SCRIPT_IDE_CONFIG_PATH = ".luarc.json";
export const SCRIPT_IDE_EXAMPLE_PATH = "Data/Scripts/examples/hello.lua";

export const SCRIPT_IDE_SUPPORT_PATHS = [
  SCRIPT_IDE_README_PATH,
  SCRIPT_IDE_CONFIG_PATH,
  SCRIPT_IDE_EXAMPLE_PATH,
] as const;

function buildLuaLsConfig(): string {
  return `${JSON.stringify({
    "$schema": "https://raw.githubusercontent.com/LuaLS/lua-language-server/master/locale en-us/scripts/configuration/schema.json",
    runtime: { version: "Lua 5.4" },
    workspace: {
      library: ["./Data/Scripts/types"],
      checkThirdParty: "Disable",
    },
    diagnostics: { globals: ["pangea"] },
  }, null, 2)}\n`;
}

function buildIdeReadme(state: ScriptWorkspaceState): string {
  const level = state.context.levelNumber === undefined
    ? "the current level"
    : `level ${String(state.context.levelNumber)}`;
  return `# ${state.context.gameLabel} Lua scripts

This package was exported from PangeaRSEdit for ${level}.

## Edit and return the package

1. Open this folder in VS Code or another Lua-aware editor.
2. Install LuaLS (the Lua Language Server) or a compatible Lua extension.
3. Edit files under \`Data/Scripts/src/\`.
4. Return to PangeaRSEdit and upload the complete package ZIP.
5. Compile the package, review diagnostics, and preview it in the game.

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

See \`SCRIPTING_API.md\` in the repository for the complete API reference.
`;
}

function buildStarterExample(): string {
  return `local pangea = require("pangea")
local entry = {}

function entry.onLevelStart(ctx)
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
    { path: SCRIPT_IDE_EXAMPLE_PATH, bytes: strToU8(buildStarterExample()) },
  ];
}
