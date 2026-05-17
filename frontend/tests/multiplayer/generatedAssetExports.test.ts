import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_EXPORTS = [
  "PangeaGame_SetNetworkMatchConfig",
  "PangeaGame_StartNetworkMatch",
  "PangeaGame_DebugGetLocalPlayerIndex",
  "PangeaGame_DebugGetPlayerCount",
  "PangeaGame_DebugIsNetworkMatchRunning",
] as const;

function expectRequiredExports(jsPath: string): void {
  const source = readFileSync(jsPath, "utf8");
  for (const exportName of REQUIRED_EXPORTS) {
    expect(source.includes(exportName)).toBe(true);
  }
}

describe("generated multiplayer wasm exports", () => {
  it("Cro-Mag generated runtime exposes required multiplayer exports", () => {
    const jsPath = resolve(
      process.cwd(),
      "public/generated/pangea-ports/wasm/cromagrally/CroMagRally.js",
    );
    expectRequiredExports(jsPath);
  });

  it("Nanosaur 2 generated runtime exposes required multiplayer exports", () => {
    const jsPath = resolve(
      process.cwd(),
      "public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.js",
    );
    expectRequiredExports(jsPath);
  });
});
