import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { io, revisionOf, scanProject } from "../src/files.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

describe("project revision scanning", () => {
  it("ignores repository internals while tracking editor metadata", async () => {
    await writeFixture(root(), ".git/config", "repository secret");
    await writeFixture(root(), ".pangea/levels/one/level.ter", "terrain");
    await writeFixture(root(), "Data/Scripts/.luarc.json", "{}");
    const result = await scanProject(root());
    expect(result.isOk() && result.value.map((entry) => entry.path)).toEqual([".pangea/levels/one/level.ter", "Data/Scripts/.luarc.json"]);
  });

  it("detects content changes even when the file size stays the same", async () => {
    await writeFixture(root(), "level", "first");
    const first = await scanProject(root());
    await writeFixture(root(), "level", "other");
    const second = await scanProject(root());
    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value[0]?.size).toBe(second.value[0]?.size);
    expect(revisionOf(first.value)).not.toBe(revisionOf(second.value));
  });

  it("rejects oversized sparse files before allocating their contents", async () => {
    await writeFixture(root(), "large", "");
    expect((await io(() => fs.truncate(path.join(root(), "large"), 128 * 1024 * 1024 + 1), "Cannot size fixture")).isOk()).toBe(true);
    const result = await scanProject(root());
    expect(result.isErr() && result.error.code).toBe("limit");
  });
});
