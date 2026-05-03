import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  __dirname,
  "../../../.github/workflows/deploy.yml",
);

describe("deploy workflow", () => {
  it("keeps generated Pangea Ports wasm artifacts in the Pages output", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("path: ./frontend/dist");
    expect(workflow).not.toContain("frontend/dist/generated");
  });
});
