export function buildLuaLsConfig(): string {
  return `${JSON.stringify({
    runtime: { version: "Lua 5.4", path: ["Data/Scripts/src/?.lua", "Data/Scripts/src/?/init.lua", "Data/Scripts/types/?.lua"] },
    workspace: { library: ["./Data/Scripts/types"], checkThirdParty: "Disable" },
    diagnostics: { globals: ["pangea"] },
  }, null, 2)}\n`;
}
