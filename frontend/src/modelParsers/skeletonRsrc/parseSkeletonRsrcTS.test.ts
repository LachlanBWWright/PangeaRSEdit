import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrcJson } from "./parseSkeletonRsrcTS";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecordValue(
  value: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  const entry = value[key];
  return isRecord(entry) ? entry : undefined;
}

describe("parseSkeletonRsrcJson", () => {
  it("keeps structured Hedr and AnHd resources in obj fields and leaves alis as raw data", async () => {
    const skelPath = join(
      __dirname,
      "../../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
    );

    const parsed = await parseSkeletonRsrcJson(bufferFromFile(skelPath));

    const hedr = getRecordValue(parsed.Hedr, "1000");
    expect(hedr).toBeDefined();
    expect(hedr).toHaveProperty("obj");
    expect(hedr).not.toHaveProperty("data");

    const anhd = getRecordValue(parsed.AnHd, "1000");
    expect(anhd).toBeDefined();
    expect(anhd).toHaveProperty("obj");
    expect(anhd).not.toHaveProperty("data");
    expect(getRecordValue(anhd, "obj")?.animName).toBe("Walk");

    const alis = isRecord(parsed.alis) ? getRecordValue(parsed.alis, "1000") : undefined;
    expect(alis).toBeDefined();
    expect(alis).toHaveProperty("data");
    expect(typeof alis?.data).toBe("string");
    expect(alis).not.toHaveProperty("obj");
  });
});
