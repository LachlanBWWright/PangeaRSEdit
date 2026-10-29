import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { PROJECT_MANIFEST, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { ProjectStore } from "../src/projectStore.ts";
import { bytes, readFixture, useTemporaryDirectory } from "./fixtures.ts";

const root = useTemporaryDirectory();
async function fixture() {
  const folder = path.join(root(), "project");
  await fs.mkdir(folder);
  const store = new ProjectStore(path.join(root(), "recovery"));
  const created = await store.create(folder, "Project limits", "OttoMatic");
  expect(created.isOk()).toBe(true); if (created.isErr()) return null;
  const assets = Array.from({ length: 4 }, (_, index) => ({ path: `asset-${index}.bin`, bytes: bytes(`original-${index}`) }));
  const saved = await store.save(created.value.revision, created.value.manifest, assets, []);
  expect(saved.isOk()).toBe(true);
  return saved.isOk() ? { store, folder, snapshot: saved.value } : null;
}

function nearSizeLimit(snapshot: ProjectSnapshot): ProjectSnapshot {
  const manifestSize = snapshot.files.find((file) => file.path === PROJECT_MANIFEST)?.size ?? 0;
  return { ...snapshot, files: snapshot.files.map((file) => ({ ...file,
    size: file.path === PROJECT_MANIFEST ? file.size : 128 * 1024 * 1024 - (file.path === "asset-0.bin" ? manifestSize + 8 : 0),
  })) };
}

it("rejects excess projected file count before changing project bytes or revision", async () => {
  const f = await fixture(); if (!f) return;
  const manifest = await readFixture(f.folder, PROJECT_MANIFEST);
  const files = Array.from({ length: 4096 }, (_, index) => ({ path: `new-${index}.bin`, bytes: new Uint8Array() }));
  const result = await f.store.save(f.snapshot.revision, { ...f.snapshot.manifest, name: "Rejected rename" }, files, []);
  expect(result.isErr() && result.error.code).toBe("limit");
  expect(await readFixture(f.folder, PROJECT_MANIFEST)).toBe(manifest);
  expect((await fs.readdir(f.folder)).filter((name) => name.startsWith("new-"))).toEqual([]);
  const current = await f.store.inspect();
  expect(current.isOk() && current.value.revision).toBe(f.snapshot.revision);
});

it("accounts for retained files when rejecting an oversized projected save", async () => {
  const f = await fixture(); if (!f) return;
  const manifest = await readFixture(f.folder, PROJECT_MANIFEST);
  const inspect = vi.spyOn(f.store, "inspect").mockResolvedValueOnce(ok(nearSizeLimit(f.snapshot)));
  const result = await f.store.save(f.snapshot.revision, f.snapshot.manifest, [{ path: "new.bin", bytes: new Uint8Array(16) }], []);
  expect(result.isErr() && result.error.code).toBe("limit");
  inspect.mockRestore();
  expect(await readFixture(f.folder, PROJECT_MANIFEST)).toBe(manifest);
  expect(await readFixture(f.folder, "asset-0.bin")).toBe("original-0");
  expect(await fs.readdir(f.folder)).not.toContain("new.bin");
  const current = await f.store.inspect();
  expect(current.isOk() && current.value.revision).toBe(f.snapshot.revision);
});

it("credits replacements and removals before checking the projected project size", async () => {
  const f = await fixture(); if (!f) return;
  vi.spyOn(f.store, "inspect").mockResolvedValueOnce(ok(nearSizeLimit(f.snapshot)));
  const result = await f.store.save(f.snapshot.revision, f.snapshot.manifest, [
    { path: "asset-0.bin", bytes: bytes("replacement") },
    { path: "new.bin", bytes: new Uint8Array(16) },
  ], ["asset-1.bin"]);
  expect(result.isOk()).toBe(true);
  expect(await readFixture(f.folder, "asset-0.bin")).toBe("replacement");
  expect(await fs.readdir(f.folder)).not.toContain("asset-1.bin");
});
