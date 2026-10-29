import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import type { Installation } from "@pangea/desktop-contracts";
import { GameStore } from "../src/gameStore.ts";
import * as launch from "../src/gameLaunch.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
async function installedStore() {
  const installation: Installation = { game: "OttoMatic", managed: false, version: "external", assetRootVersion: 2,
    executable: path.join(root(), "external/OttoMatic"), data: path.join(root(), "external/Data") };
  await writeFixture(root(), "installed.json", JSON.stringify([installation]));
  const store = new GameStore(root(), () => undefined);
  expect((await store.load()).isOk()).toBe(true);
  return store;
}

describe("running game lifecycle", () => {
  it("blocks removal and updates until every running instance exits", async () => {
    const store = await installedStore();
    const exited: (() => void)[] = [];
    vi.spyOn(launch, "launchGame").mockImplementation(async (_installation, _directory, _files, _args, onExit) => {
      if (onExit) exited.push(onExit);
      return ok(undefined);
    });
    expect((await store.launch("OttoMatic")).isOk()).toBe(true);
    expect((await store.launch("OttoMatic")).isOk()).toBe(true);
    expect(exited).toHaveLength(2);
    const removal = await store.remove("OttoMatic");
    expect(removal.isErr() && removal.error.code).toBe("busy");
    const update = await store.install("OttoMatic", "v2");
    expect(update.isErr() && update.error.code).toBe("busy");
    exited[0]?.();
    const stillRunning = await store.remove("OttoMatic");
    expect(stillRunning.isErr() && stillRunning.error.code).toBe("busy");
    exited[1]?.();
    const removed = await store.remove("OttoMatic");
    expect(removed.isOk() && removed.value).toEqual([]);
  });

  it("releases failed launches without releasing an existing running instance", async () => {
    const store = await installedStore();
    let exited: () => void = () => undefined;
    vi.spyOn(launch, "launchGame").mockImplementationOnce(async (_installation, _directory, _files, _args, onExit) => {
      if (onExit) exited = onExit;
      return ok(undefined);
    }).mockResolvedValue(err({ code: "launch", message: "Spawn failed" }));
    expect((await store.launch("OttoMatic")).isOk()).toBe(true);
    expect((await store.launch("OttoMatic")).isErr()).toBe(true);
    const busy = await store.remove("OttoMatic");
    expect(busy.isErr() && busy.error.code).toBe("busy");
    exited();
    expect((await store.remove("OttoMatic")).isOk()).toBe(true);
  });
});
