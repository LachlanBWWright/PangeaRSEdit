import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrcJson } from "./parseSkeletonRsrcTS";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("parseSkeletonRsrcJson", () => {
  it("keeps structured Hedr and AnHd resources in obj fields and leaves alis as raw data", async () => {
    const skelPath = join(
      __dirname,
      "../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
    );

    const parsed = await parseSkeletonRsrcJson(bufferFromFile(skelPath));

    const hedr = parsed.Hedr?.["1000"] as Record<string, unknown> | undefined;
    expect(hedr).toBeDefined();
    expect(hedr).toHaveProperty("obj");
    expect(hedr).not.toHaveProperty("data");

    const anhd = parsed.AnHd?.["1000"] as Record<string, unknown> | undefined;
    expect(anhd).toBeDefined();
    expect(anhd).toHaveProperty("obj");
    expect(anhd).not.toHaveProperty("data");
    expect((anhd?.obj as Record<string, unknown> | undefined)?.animName).toBe(
      "Walk",
    );

    const alis = parsed.alis?.["1000"] as Record<string, unknown> | undefined;
    expect(alis).toBeDefined();
    expect(alis).toHaveProperty("data");
    expect(typeof alis?.data).toBe("string");
    expect(alis).not.toHaveProperty("obj");
  });
});
