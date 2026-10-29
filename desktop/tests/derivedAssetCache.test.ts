import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok } from "neverthrow";
import { expect, it } from "vitest";
import { DerivedAssetCache, type AssetRecipe } from "../src/derivedAssetCache.ts";
import { failure, io } from "../src/files.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

function fixture() {
  let builds = 0;
  const cache = new DerivedAssetCache(path.join(root(), "cache"));
  const recipe: AssetRecipe = {
    id: "test", version: 1, extension: "bin",
    dependencies: [{ name: "input.bin", path: path.join(root(), "input.bin") }],
    build: async (directory) => {
      builds++;
      const output = path.join(directory, "output.bin");
      return io(() => fs.copyFile(path.join(directory, "input.bin"), output), "Cannot convert fixture").then((result) => result.map(() => output));
    },
  };
  return { cache, recipe, builds: () => builds };
}

it("deduplicates concurrent builds and ignores timestamp-only changes", async () => {
  await writeFixture(root(), "input.bin", "first");
  const { cache, recipe, builds } = fixture();
  const results = await Promise.all(Array.from({ length: 12 }, () => cache.get(recipe)));
  expect(results.every((result) => result.isOk())).toBe(true);
  expect(new Set(results.map((result) => result.isOk() ? result.value : null)).size).toBe(1);
  expect(builds()).toBe(1);
  const time = new Date(Date.now() + 5000);
  await fs.utimes(path.join(root(), "input.bin"), time, time);
  await cache.get(recipe);
  expect(builds()).toBe(1);
});

it("invalidates on same-size source edits, recipe versions, and corrupted output", async () => {
  await writeFixture(root(), "input.bin", "first");
  const { cache, recipe, builds } = fixture();
  const first = await cache.get(recipe);
  expect(first.isOk()).toBe(true);
  if (first.isErr()) return;
  await fs.writeFile(first.value, "broke");
  expect((await cache.get(recipe)).isOk()).toBe(true);
  expect(await fs.readFile(first.value, "utf8")).toBe("first");
  const info = await fs.stat(path.join(root(), "input.bin"));
  await writeFixture(root(), "input.bin", "other");
  await fs.utimes(path.join(root(), "input.bin"), info.atime, info.mtime);
  const changed = await cache.get(recipe);
  expect(changed.isOk() ? changed.value : null).not.toBe(first.value);
  await cache.get({ ...recipe, version: 2 });
  expect(builds()).toBe(4);
});

it("retries failed conversions and removes staging files", async () => {
  await writeFixture(root(), "input.bin", "first");
  const { cache, recipe, builds } = fixture();
  expect((await cache.get({ ...recipe, build: async () => err(failure("Invalid model", "conversion")) })).isErr()).toBe(true);
  expect((await cache.get(recipe)).isOk()).toBe(true);
  expect(builds()).toBe(1);
  expect((await fs.readdir(path.join(root(), "cache"))).some((name) => name.startsWith(".staging"))).toBe(false);
});

it("bounds conversion concurrency", async () => {
  await writeFixture(root(), "input.bin", "first");
  const { cache, recipe } = fixture();
  let active = 0;
  let maximum = 0;
  const results = await Promise.all(Array.from({ length: 15 }, (_, version) => cache.get({
    ...recipe, version,
    build: async (directory) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      const input = await fs.readFile(path.join(directory, "input.bin"), "utf8");
      expect(input).toBe("first");
      active--;
      return ok(path.join(directory, "input.bin"));
    },
  })));
  expect(results.every((result) => result.isOk())).toBe(true);
  expect(maximum).toBe(2);
});

it("builds from a snapshot when the original input is edited during conversion", async () => {
  await writeFixture(root(), "input.bin", "first");
  const { cache, recipe } = fixture();
  const result = await cache.get({ ...recipe, build: async (directory) => {
    await writeFixture(root(), "input.bin", "later");
    return ok(path.join(directory, "input.bin"));
  } });
  expect(result.isOk()).toBe(true);
  if (result.isOk()) expect(await fs.readFile(result.value, "utf8")).toBe("first");
  const next = await cache.get(recipe);
  expect(next.isOk()).toBe(true);
  if (result.isOk() && next.isOk()) expect(next.value).not.toBe(result.value);
});

it.each(["..", ".", "../outside", ""])("rejects invalid snapshot name %s", async (name) => {
  const { cache, recipe } = fixture();
  expect((await cache.get({ ...recipe, dependencies: [{ name, path: "absent" }] })).isErr()).toBe(true);
});
