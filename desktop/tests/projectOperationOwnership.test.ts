import path from "node:path";
import { expect, it, vi } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { bytes, useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const directory = useTemporaryDirectory();

async function fixture() {
  const first = path.join(directory(), "first");
  const second = path.join(directory(), "second");
  const manifest = (name: string) => JSON.stringify({ kind: "pangea-editor-project", version: 1,
    name, game: "OttoMatic", levels: [] });
  await writeFixture(first, "pangea.project.json", manifest("First"));
  await writeFixture(second, "pangea.project.json", manifest("Second"));
  const store = new ProjectStore(path.join(directory(), "recovery"));
  const opened = await store.open(first);
  expect(opened.isOk()).toBe(true);
  return opened.isOk() ? { store, first, second, snapshot: opened.value } : null;
}

it("serializes opening against saves and other project replacements", async () => {
  const f = await fixture();
  if (!f) return;
  let entered = false;
  let release: () => void = () => undefined;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(f.store.versions, "capture").mockImplementationOnce(async () => { entered = true; await waiting; });
  const opening = f.store.open(f.second);
  await vi.waitFor(() => expect(entered).toBe(true));
  expect(f.store.busy()).toBe(true);
  const saving = await f.store.save(f.snapshot.revision, f.snapshot.manifest, [{ path: "draft.txt", bytes: bytes("draft") }], []);
  expect(saving.isErr() && saving.error.code).toBe("busy");
  const replacing = await f.store.open(f.first);
  expect(replacing.isErr() && replacing.error.code).toBe("busy");
  const copying = await f.store.copy(path.join(directory(), "copy"), f.snapshot.revision);
  expect(copying.isErr() && copying.error.code).toBe("busy");
  release();
  expect((await opening).isOk()).toBe(true);
  expect(f.store.folder()).toBe(f.second);
  expect(f.store.busy()).toBe(false);
});

it("rejects an inspection whose active project changed while its baseline was captured", async () => {
  const f = await fixture();
  if (!f) return;
  let entered = false;
  let release: () => void = () => undefined;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(f.store.versions, "capture").mockImplementationOnce(async () => { entered = true; await waiting; });
  const stale = f.store.inspect();
  await vi.waitFor(() => expect(entered).toBe(true));
  const switched = await f.store.open(f.second);
  expect(switched.isOk()).toBe(true);
  release();
  const result = await stale;
  expect(result.isErr() && result.error.code).toBe("conflict");
  expect(f.store.folder()).toBe(f.second);
});
