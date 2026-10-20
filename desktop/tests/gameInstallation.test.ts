import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import { findInstallation } from "../src/gameInstallation.ts";
import * as processes from "../src/processes.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

describe("trusted installation compatibility probe", () => {
  it.each(["OttoMatic", "OttoMatic.exe"])("finds %s with a Data directory and probes without starting the game", async (name) => {
    await writeFixture(root(), `nested/${name}`, "executable fixture");
    await writeFixture(root(), "nested/Data/System/file", "stock");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(ok("1\n"));
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk() && found.value).toEqual({ executable: path.join(root(), `nested/${name}`), data: path.join(root(), "nested/Data") });
    expect(probe).toHaveBeenCalledExactlyOnceWith(path.join(root(), `nested/${name}`), ["--editor-data-root-version"], path.join(root(), "nested"));
  });

  it("recognizes macOS bundle Resources/Data layout", async () => {
    await writeFixture(root(), "OttoMatic.app/Contents/MacOS/OttoMatic", "executable fixture");
    await writeFixture(root(), "OttoMatic.app/Contents/Resources/Data/System/file", "stock");
    vi.spyOn(processes, "runProcess").mockResolvedValue(ok("1"));
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk() && found.value.data).toBe(path.join(root(), "OttoMatic.app/Contents/Resources/Data"));
  });

  it.each([ok("2"), ok(""), ok("1\nother output"), err({ code: "launch", message: "Incompatible" })])
  ("refuses incompatible compatibility replies: %j", async (reply) => {
    await writeFixture(root(), "OttoMatic", "executable fixture");
    await writeFixture(root(), "Data/System/file", "stock");
    vi.spyOn(processes, "runProcess").mockResolvedValue(reply);
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isErr() && found.error.code).toBe("incompatible");
  });

  it("does not probe executables for another game or installations without stock data", async () => {
    await writeFixture(root(), "OttoMatic", "executable fixture");
    const probe = vi.spyOn(processes, "runProcess");
    expect((await findInstallation(root(), "OttoMatic")).isErr()).toBe(true);
    await writeFixture(root(), "Data/System/file", "stock");
    expect((await findInstallation(root(), "Bugdom")).isErr()).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });
});
