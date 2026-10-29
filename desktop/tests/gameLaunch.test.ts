import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { launchGame, validLaunchArguments } from "../src/gameLaunch.ts";
import { io } from "../src/files.ts";
import * as processes from "../src/processes.ts";
import { releaseManifestSchema } from "@pangea/desktop-contracts";
import { completeRelease } from "../src/gameCatalog.ts";

describe("native launch boundary", () => {
  it("does not release another running game's slot when spawning fails", async () => {
    const exited = vi.fn();
    const result = await launchGame({ game: "OttoMatic", version: "external", managed: false, assetRootVersion: 2,
      data: os.tmpdir(), executable: path.join(os.tmpdir(), "pangea-nonexistent-game", "OttoMatic") },
      path.join(os.tmpdir(), "unused-pangea-run"), undefined, [], exited);
    expect(result.isErr()).toBe(true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(exited).not.toHaveBeenCalled();
  });
  it("stages current edits separately and never modifies installed game data", async () => {
    const fixture = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-launch-")), "Fixture failed");
    expect(fixture.isOk()).toBe(true);
    if (fixture.isErr()) return;
    const data = path.join(fixture.value, "installed", "Data");
    const run = path.join(fixture.value, "run");
    await io(() => fs.mkdir(data, { recursive: true }), "Fixture failed");
    await io(() => fs.writeFile(path.join(data, "level.ter"), "stock"), "Fixture failed");
    const startProcess = processes.startProcess;
    const spawn = vi.spyOn(processes, "startProcess").mockImplementation(() =>
      startProcess(process.execPath, ["-e", "setTimeout(() => process.exit(0), 5000)"], fixture.value));
    const executable = path.join(fixture.value, "installed", "OttoMatic");
    const launched = await launchGame({ game: "OttoMatic", version: "v1", managed: true, assetRootVersion: 2, data, executable },
      run, [{ path: "Data/level.ter", bytes: new TextEncoder().encode("unsaved editor data") }], ["--level", "0"]);
    expect(launched.isOk()).toBe(true);
    expect(spawn).toHaveBeenCalledWith(executable, ["--data-dir", path.join(run, "Data"), "--level", "0"], run, {
      PANGEA_SCRIPT_INSPECTOR: "1", PANGEA_SCRIPT_INSPECTOR_REQUEST: path.join(run, ".pangea-inspector-request"),
    });
    const stock = await io(() => fs.readFile(path.join(data, "level.ter"), "utf8"), "Cannot read stock");
    const staged = await io(() => fs.readFile(path.join(run, "Data/level.ter"), "utf8"), "Cannot read staged");
    expect(stock.isOk() && stock.value).toBe("stock");
    expect(staged.isOk() && staged.value).toBe("unsaved editor data");
    const spawned = spawn.mock.results[0]?.value;
    if (spawned?.isOk()) spawned.value.kill();
    spawn.mockRestore();
    await io(() => fs.rm(fixture.value, { recursive: true, force: true }), "Cleanup failed");
  });
  it("allows supported level arguments and refuses arbitrary switches", () => {
    expect(validLaunchArguments(["--level", "3"])).toBe(true);
    expect(validLaunchArguments(["--level", "2:1"])).toBe(true);
    expect(validLaunchArguments(["--track", "4", "--car", "1"])).toBe(true);
    expect(validLaunchArguments(["--data-dir", "/untrusted"])).toBe(false);
    expect(validLaunchArguments(["--level", "1;rm -rf x"])).toBe(false);
    expect(validLaunchArguments(["--level"])).toBe(false);
  });
  it("rejects incompatible release contracts", () => {
    const release = { version: 1, tag: "v1", sourceRevision: "abc", assetRootVersion: 2, scriptContractVersion: 2, assets: [] };
    expect(releaseManifestSchema.safeParse(release).success).toBe(true);
    expect(releaseManifestSchema.safeParse({ ...release, assetRootVersion: 1 }).success).toBe(false);
    expect(releaseManifestSchema.safeParse({ ...release, scriptContractVersion: 1 }).success).toBe(false);
    const incomplete = releaseManifestSchema.safeParse(release);
    expect(incomplete.success && completeRelease(incomplete.data)).toBe(false);
  });
});
