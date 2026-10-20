import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { err } from "neverthrow";
import { saveTransaction, recoverInterruptedSave } from "../src/projectTransaction.ts";
import * as files from "../src/files.ts";
import { bytes, readFixture, useTemporaryDirectory, writeFixture } from "./fixtures.ts";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original };
});

const root = useTemporaryDirectory();
const journal = ".pangea/transaction.json";

describe("multi-file transactions", () => {
  it("replaces binary files, removes obsolete files, and clears the journal", async () => {
    await writeFixture(root(), "old.lua", "obsolete");
    await writeFixture(root(), "asset.bin", "previous");
    const content = new Uint8Array([0, 255, 128, 0]);
    const saved = await saveTransaction(root(), [{ path: "asset.bin", bytes: content }], ["old.lua", "already-missing"]);
    expect(saved.isOk()).toBe(true);
    const read = await files.io(() => fs.readFile(path.join(root(), "asset.bin")), "Cannot read binary");
    expect(read.isOk() && Uint8Array.from(read.value)).toEqual(content);
    for (const removed of [journal, "old.lua"]) expect(await files.statOrMissing(path.join(root(), removed))).toEqual(expect.objectContaining({ value: null }));
  });

  it.each([
    { outputs: ["duplicate", "duplicate"], removed: [] },
    { outputs: ["duplicate"], removed: ["duplicate"] },
    { outputs: [], removed: ["duplicate", "duplicate"] },
    { outputs: [], removed: ["pangea.project.json"] },
    { outputs: [journal], removed: [] },
    { outputs: [], removed: [journal] },
    { outputs: ["../escaped"], removed: [] },
  ])("rejects invalid destinations before changing files: %j", async ({ outputs, removed }) => {
    await writeFixture(root(), "duplicate", "original");
    const saved = await saveTransaction(root(), outputs.map((name) => ({ path: name, bytes: bytes("replacement") })), removed);
    expect(saved.isErr() && saved.error.code).toBe("invalid");
    expect(await readFixture(root(), "duplicate")).toBe("original");
    const recorded = await files.statOrMissing(path.join(root(), journal));
    expect(recorded.isOk() && recorded.value).toBeNull();
  });

  it("rolls back replacements and new files when a later write fails", async () => {
    await writeFixture(root(), "existing", "original");
    await writeFixture(root(), "last", "last-original");
    const atomicWrite = files.atomicWrite;
    vi.spyOn(files, "atomicWrite").mockImplementation((target, content) =>
      target === path.join(root(), "last") && new TextDecoder().decode(content) === "fail"
        ? Promise.resolve(err(files.failure("Injected disk failure"))) : atomicWrite(target, content));
    const result = await saveTransaction(root(), [
      { path: "existing", bytes: bytes("changed") },
      { path: "new", bytes: bytes("created") },
      { path: "last", bytes: bytes("fail") },
    ], []);
    expect(result.isErr() && result.error.code).toBe("filesystem");
    expect(await readFixture(root(), "existing")).toBe("original");
    expect(await readFixture(root(), "last")).toBe("last-original");
    const newFile = await files.statOrMissing(path.join(root(), "new"));
    expect(newFile.isOk() && newFile.value).toBeNull();
    expect((await recoverInterruptedSave(root())).isOk()).toBe(true);
  });

  it("restores earlier deletions when removing a later file fails", async () => {
    await writeFixture(root(), "first", "first-original");
    await writeFixture(root(), "second", "second-original");
    const remove = fs.rm;
    vi.spyOn(fs, "rm").mockImplementation((target, options) =>
      target === path.join(root(), "second") ? Promise.reject(new Error("Removal failed")) : remove(target, options));
    const result = await saveTransaction(root(), [], ["first", "second"]);
    expect(result.isErr() && result.error.code).toBe("filesystem");
    expect(await readFixture(root(), "first")).toBe("first-original");
    expect(await readFixture(root(), "second")).toBe("second-original");
  });

  it("retains a replayable journal when rollback also fails", async () => {
    await writeFixture(root(), "existing", "original");
    const atomicWrite = files.atomicWrite;
    const writer = vi.spyOn(files, "atomicWrite").mockImplementation((target, content) =>
      target === path.join(root(), journal) ? atomicWrite(target, content)
        : Promise.resolve(err(files.failure("Disk unavailable"))));
    const result = await saveTransaction(root(), [{ path: "existing", bytes: bytes("changed") }], []);
    expect(result.isErr() && result.error.code).toBe("rollback");
    expect(await readFixture(root(), journal)).toContain("existing");
    writer.mockRestore();
    expect((await recoverInterruptedSave(root())).isOk()).toBe(true);
    expect(await readFixture(root(), "existing")).toBe("original");
  });

  it("replays a crash journal once, including deletion of partially created files", async () => {
    await writeFixture(root(), "old", "partial");
    await writeFixture(root(), "new", "partial");
    await writeFixture(root(), journal, JSON.stringify([
      { path: "old", bytes: Buffer.from("original").toString("base64") },
      { path: "new", bytes: null },
      { path: "empty", bytes: "" },
    ]));
    expect((await recoverInterruptedSave(root())).isOk()).toBe(true);
    expect(await readFixture(root(), "old")).toBe("original");
    expect(await readFixture(root(), "empty")).toBe("");
    const removed = await files.statOrMissing(path.join(root(), "new"));
    expect(removed.isOk() && removed.value).toBeNull();
    expect((await recoverInterruptedSave(root())).isOk()).toBe(true);
  });

  it.each(["broken JSON", "{}", '[{"path":"../escape","bytes":null}]',
    '[{"path":".pangea/transaction.json","bytes":null}]', '[{"path":"old","bytes":"!"}]'])
  ("preserves invalid journals and existing content: %s", async (content) => {
    await writeFixture(root(), "old", "unchanged");
    await writeFixture(root(), journal, content);
    const result = await recoverInterruptedSave(root());
    expect(result.isErr() && result.error.code).toBe("invalid");
    expect(await readFixture(root(), "old")).toBe("unchanged");
    expect(await readFixture(root(), journal)).toBe(content);
  });
});
