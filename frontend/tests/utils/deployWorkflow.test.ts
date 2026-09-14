import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  __dirname,
  "../../../.github/workflows/build-native-releases.yml",
);

describe("Pages deployment workflow", () => {
  it("keeps generated Pangea Ports wasm artifacts in the Pages output", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    const wasmJobIndex = workflow.indexOf("  build-wasm:");
    const deployJobIndex = workflow.indexOf("  deploy-pages:");
    const wasmBuildIndex = workflow.indexOf(
      "run: pnpm --dir frontend run build:games",
    );

    expect(wasmJobIndex).toBeGreaterThanOrEqual(0);
    expect(deployJobIndex).toBeGreaterThan(wasmJobIndex);
    expect(wasmBuildIndex).toBeGreaterThan(wasmJobIndex);
    expect(wasmBuildIndex).toBeLessThan(deployJobIndex);
    expect(workflow).toContain("name: frontend-game-wasm");
    expect(workflow).toContain("name: frontend-game-wasm\n          path:");
    expect(workflow).toContain(
      "needs: [build-wasm, build-linux, build-macos, build-windows, build-android]",
    );
    expect(workflow).toContain(
      "find release-artifacts -mindepth 2 -maxdepth 2 -type f -print0",
    );
    expect(workflow).toContain("path: ./frontend/dist");
    expect(workflow).not.toContain("frontend/dist/generated");
  });
});
