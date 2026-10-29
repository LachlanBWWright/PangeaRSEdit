import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { NativeAssetIndex } from "../src/nativeAssetIndex.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
it("resolves platform casing and sees newly added and deleted assets", async () => {
  const index = new NativeAssetIndex();
  expect(await index.resolve(root(), "Models/Level.bg3d")).toMatchObject({ value: null });
  await writeFixture(root(), "models/LEVEL.BG3D", "native");
  expect(await index.resolve(root(), "Models/Level.bg3d")).toMatchObject({ value: path.join(root(), "models/LEVEL.BG3D") });
  await fs.unlink(path.join(root(), "models/LEVEL.BG3D"));
  expect(await index.resolve(root(), "Models/Level.bg3d")).toMatchObject({ value: null });
});

it("rejects ambiguous names even when one matches the requested casing exactly", async () => {
  await writeFixture(root(), "Models/Level.bg3d", "first");
  await writeFixture(root(), "Models/LEVEL.bg3d", "second");
  const result = await new NativeAssetIndex().resolve(root(), "Models/Level.bg3d");
  if ((await fs.readdir(path.join(root(), "Models"))).length < 2) {
    expect(result.isOk()).toBe(true);
    return;
  }
  expect(result.isErr() ? result.error.code : null).toBe("ambiguous");
});

it.skipIf(process.platform === "win32")("rejects traversal and symlinked folders and files", async () => {
  await writeFixture(root(), "real/file.bg3d", "native");
  await fs.symlink(path.join(root(), "real"), path.join(root(), "Models"));
  await fs.symlink(path.join(root(), "real/file.bg3d"), path.join(root(), "linked.bg3d"));
  const index = new NativeAssetIndex();
  for (const relative of ["../outside", "Models/file.bg3d", "linked.bg3d"]) {
    expect((await index.resolve(root(), relative)).isErr()).toBe(true);
  }
});
