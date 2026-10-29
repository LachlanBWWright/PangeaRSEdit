import path from "node:path";
import * as fs from "node:fs/promises";
import { expect, it } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { useTemporaryDirectory, writeFixture, readFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
const bytes = (text: string) => new TextEncoder().encode(text);
async function fixture() {
  const store = new ProjectStore(path.join(root(), "recovery"));
  const created = await store.create(root(), "Merge", "OttoMatic");
  expect(created.isOk()).toBe(true);
  if (created.isErr()) return null;
  const saved = await store.save(created.value.revision, created.value.manifest, [
    { path: "Data/Scripts/src/user.lua", bytes: bytes("a = 1\nb = 1\nc = 1\n") },
    { path: "Assets/model.bg3d", bytes: new Uint8Array([0, 1, 2]) },
  ], []);
  expect(saved.isOk()).toBe(true);
  return saved.isOk() ? { store, base: saved.value } : null;
}

it("merges disjoint Lua edits and explicitly resolves a binary conflict in the same transaction", async () => {
  const f = await fixture(); if (!f) return;
  await writeFixture(root(), "Data/Scripts/src/user.lua", "a = 1\nb = 1\nc = 2\n");
  await writeFixture(root(), "Assets/model.bg3d", new Uint8Array([0, 3, 4]));
  const reviewed = await f.store.reviews.review(f.base, { manifest: f.base.manifest, removed: [], files: [
    { path: "Data/Scripts/src/user.lua", bytes: bytes("a = 2\nb = 1\nc = 1\n") },
    { path: "Assets/model.bg3d", bytes: new Uint8Array([0, 8, 9]) },
  ] });
  expect(reviewed.isOk()).toBe(true); if (reviewed.isErr()) return;
  expect(reviewed.value.files.find((file) => file.path.endsWith("user.lua"))).toMatchObject({ decision: "merged", merged: "a = 2\nb = 1\nc = 2\n", baseAvailable: true });
  expect(reviewed.value.files.find((file) => file.path.endsWith("bg3d"))).toMatchObject({ binary: true, decision: "unresolved" });
  expect((await f.store.reviews.apply(reviewed.value.id, [])).isErr()).toBe(true);
  const applied = await f.store.reviews.apply(reviewed.value.id, [{ path: "Assets/model.bg3d", choice: "disk" }]);
  expect(applied.isOk()).toBe(true);
  expect(await readFixture(root(), "Data/Scripts/src/user.lua")).toBe("a = 2\nb = 1\nc = 2\n");
  const binary = await f.store.read(["Assets/model.bg3d"]);
  expect(binary.isOk() && binary.value[0]?.bytes).toEqual(new Uint8Array([0, 3, 4]));
});

it("keeps editor binary bytes, rejects stale reviews, and supports explicit text resolution", async () => {
  const f = await fixture(); if (!f) return;
  await writeFixture(root(), "Data/Scripts/src/user.lua", "a = 3\nb = 1\nc = 1\n");
  const review = await f.store.reviews.review(f.base, { manifest: f.base.manifest, removed: [], files: [
    { path: "Data/Scripts/src/user.lua", bytes: bytes("a = 2\nb = 1\nc = 1\n") },
    { path: "Assets/model.bg3d", bytes: new Uint8Array([0, 9, 8]) },
  ] });
  if (review.isErr()) return;
  expect(review.value.files.find((file) => file.path.endsWith("user.lua"))?.decision).toBe("unresolved");
  const applied = await f.store.reviews.apply(review.value.id, [{ path: "Data/Scripts/src/user.lua", choice: "merged", text: "a = 4\nb = 1\nc = 1\n" }]);
  expect(applied.isOk()).toBe(true);
  expect(await readFixture(root(), "Data/Scripts/src/user.lua")).toContain("a = 4");
  const binary = await f.store.read(["Assets/model.bg3d"]);
  expect(binary.isOk() && binary.value[0]?.bytes).toEqual(new Uint8Array([0, 9, 8]));
  const next = await f.store.reviews.review(f.base, { manifest: f.base.manifest, files: [], removed: [] });
  if (next.isErr()) return;
  await writeFixture(root(), "changed.txt", "another edit");
  const stale = await f.store.reviews.apply(next.value.id, []);
  expect(stale.isErr() && stale.error.code).toBe("conflict");
});

it("rejects an invalid merged manifest without writing any file", async () => {
  const f = await fixture(); if (!f) return;
  const review = await f.store.reviews.review(f.base, { manifest: { ...f.base.manifest, name: "Local rename" }, files: [], removed: [] });
  if (review.isErr()) return;
  const invalid = await f.store.reviews.apply(review.value.id, [{ path: "pangea.project.json", choice: "merged", text: "{}" }]);
  expect(invalid.isErr()).toBe(true);
  const current = await f.store.inspect();
  expect(current.isOk() && current.value.manifest.name).toBe("Merge");
});

it("preserves the current review and merge baseline when another project cannot open", async () => {
  const invalid = path.join(root(), "invalid-project");
  await fs.mkdir(invalid);
  await fs.writeFile(path.join(invalid, "pangea.project.json"), "{}");
  const f = await fixture(); if (!f) return;
  const source = "Data/Scripts/src/user.lua";
  await writeFixture(root(), source, "a = 1\nb = 1\nc = 2\n");
  const review = await f.store.reviews.review(f.base, { manifest: f.base.manifest, removed: [], files: [
    { path: source, bytes: bytes("a = 2\nb = 1\nc = 1\n") },
  ] });
  expect(review.isOk()).toBe(true); if (review.isErr()) return;
  const before = f.base.files.find((file) => file.path === source);
  expect(before).toBeDefined(); if (!before) return;
  expect((await f.store.open(invalid)).isErr()).toBe(true);
  expect(f.store.folder()).toBe(root());
  expect(f.store.versions.get(before.hash)).toBe("a = 1\nb = 1\nc = 1\n");
  expect((await f.store.reviews.apply(review.value.id, [])).isOk()).toBe(true);
  expect(await readFixture(root(), source)).toBe("a = 2\nb = 1\nc = 2\n");
});
