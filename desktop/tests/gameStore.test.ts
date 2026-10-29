import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Installation } from "@pangea/desktop-contracts";
import { GameStore } from "../src/gameStore.ts";
import { EditorAssets } from "../src/editorAssets.ts";
import { statOrMissing } from "../src/files.ts";
import { readFixture, useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
function installation(managed: boolean): Installation {
  return { game: "OttoMatic", version: "v1", executable: path.join(root(), "OttoMatic/version/OttoMatic"),
    data: path.join(root(), "OttoMatic/version/Data"), assetRootVersion: 2, managed };
}
const games = () => new GameStore(root(), () => undefined);

describe("offline installations", () => {
  it("starts with no games and returns a typed error when Play is unavailable", async () => {
    const store = games();
    const loaded = await store.load();
    expect(loaded.isOk() && loaded.value).toEqual([]);
    const result = await store.launch("OttoMatic");
    expect(result.isErr() && result.error.code).toBe("not-installed");
    const unavailable = await store.install("OttoMatic", "missing");
    expect(unavailable.isErr() && unavailable.error.code).toBe("unavailable");
  });

  it.each(["not-json", "{}", '[{"game":"Unknown"}]'])("rejects invalid runtime registry: %s", async (content) => {
    await writeFixture(root(), "installed.json", content);
    const loaded = await games().load();
    expect(loaded.isErr() && loaded.error.code).toBe("invalid");
    expect(await readFixture(root(), "installed.json")).toBe(content);
  });

  it("loads installed games without contacting the release service", async () => {
    const record = installation(false);
    await writeFixture(root(), "installed.json", JSON.stringify([record]));
    const loaded = await games().load();
    expect(loaded.isOk() && loaded.value).toEqual([record]);
  });

  it.each([false, true])("ignores epoch-one cached runtimes while preserving current=%s installations and external files", async (includeCurrent) => {
    const previous = { ...installation(false), assetRootVersion: 1 };
    const current: Installation = { ...installation(true), game: "Bugdom", version: "epoch-two" };
    const records = includeCurrent ? [previous, current] : [previous];
    const originalRegistry = JSON.stringify(records);
    await writeFixture(root(), "installed.json", originalRegistry);
    await writeFixture(previous.data, "stock.dat", "external stock");
    const store = games();
    const loaded = await store.load();
    expect(loaded.isOk() && loaded.value).toEqual(includeCurrent ? [current] : []);
    const rejected = await store.launch("OttoMatic");
    expect(rejected.isErr() && rejected.error.code).toBe("not-installed");
    expect(await readFixture(previous.data, "stock.dat")).toBe("external stock");
    expect(await readFixture(root(), "installed.json")).toBe(originalRegistry);
  });

  it.each([false, true])("removing managed=%s persists removal and respects installation ownership", async (managed) => {
    const record = installation(managed);
    await writeFixture(root(), "installed.json", JSON.stringify([record]));
    await writeFixture(root(), "OttoMatic/version/Data/stock", "stock");
    const store = games();
    expect((await store.load()).isOk()).toBe(true);
    const removed = await store.remove("OttoMatic");
    expect(removed.isOk() && removed.value).toEqual([]);
    const file = await statOrMissing(path.join(record.data, "stock"));
    expect(file.isOk() && file.value !== null).toBe(!managed);
    const reopened = await games().load();
    expect(reopened.isOk() && reopened.value).toEqual([]);
  });
});

describe("optional editor assets", () => {
  it("persists registrations, resolves assets safely, and removes only the selected game", async () => {
    const assets = new EditorAssets(root());
    const otto = path.join(root(), "editor-assets/OttoMatic/version");
    const bugdom = path.join(root(), "editor-assets/Bugdom/version");
    await writeFixture(otto, "Data/stock", "otto");
    await writeFixture(bugdom, "Data/other", "bugdom");
    expect((await assets.register("OttoMatic", "v1", otto)).isOk()).toBe(true);
    expect((await assets.register("Bugdom", "v1", bugdom)).isOk()).toBe(true);
    const reopened = new EditorAssets(root());
    const loaded = await reopened.load();
    expect(loaded.isOk() && loaded.value).toHaveLength(2);
    expect(await reopened.resolve("Data/stock")).toBe(path.join(otto, "Data/stock"));
    expect(await reopened.resolve("../assets.json")).toBeNull();
    expect(await reopened.resolve("Data")).toBeNull();
    expect((await reopened.remove("OttoMatic")).isOk()).toBe(true);
    expect(await reopened.resolve("Data/stock")).toBeNull();
    expect(await reopened.resolve("Data/other")).toBe(path.join(bugdom, "Data/other"));
    expect(await readFixture(bugdom, "Data/other")).toBe("bugdom");
  });

  it("replaces an asset version and cleans only an owned UUID directory", async () => {
    const assets = new EditorAssets(root());
    const old = path.join(root(), "editor-assets/OttoMatic/12345678-1234-1234-1234-123456789abc");
    const next = path.join(root(), "editor-assets/OttoMatic/new");
    await writeFixture(old, "Data/stock", "old");
    await writeFixture(next, "Data/stock", "new");
    expect((await assets.register("OttoMatic", "v1", old)).isOk()).toBe(true);
    expect((await assets.register("OttoMatic", "v2", next)).isOk()).toBe(true);
    const oldFolder = await statOrMissing(old);
    expect(oldFolder.isOk() && oldFolder.value).toBeNull();
    expect(await assets.resolve("Data/stock")).toBe(path.join(next, "Data/stock"));
    const external = path.join(root(), "external");
    await writeFixture(external, "Data/stock", "external");
    expect((await assets.register("OttoMatic", "external", external)).isOk()).toBe(true);
    expect((await assets.register("OttoMatic", "v3", next)).isOk()).toBe(true);
    expect(await readFixture(external, "Data/stock")).toBe("external");
  });
});
