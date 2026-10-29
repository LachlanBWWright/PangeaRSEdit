import path from "node:path";
import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import { gameIdSchema } from "@pangea/desktop-contracts";
import { findInstallation } from "../src/gameInstallation.ts";
import { io } from "../src/files.ts";
import * as processes from "../src/processes.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();

describe("trusted installation compatibility probe", () => {
  it.each(["OttoMatic", "OttoMatic.exe"])("finds %s with a Data directory and probes without starting the game", async (name) => {
    await writeFixture(root(), `nested/${name}`, "executable fixture");
    await writeFixture(root(), "nested/Data/System/file", "stock");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2\n"));
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk() && found.value).toEqual({ executable: path.join(root(), `nested/${name}`), data: path.join(root(), "nested/Data") });
    expect(probe).toHaveBeenCalledExactlyOnceWith(path.join(root(), `nested/${name}`), ["--editor-data-root-version"], path.join(root(), "nested"));
  });

  it.each(["Resources", "Resources/Data"])("recognizes macOS bundle %s layout", async (resources) => {
    await writeFixture(root(), "OttoMatic.app/Contents/MacOS/OttoMatic", "executable fixture");
    await writeFixture(root(), `OttoMatic.app/Contents/${resources}/System/file`, "stock");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2"));
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk() && found.value.data).toBe(path.join(root(), `OttoMatic.app/Contents/${resources}`));
    expect(probe).toHaveBeenCalledExactlyOnceWith(path.join(root(), "OttoMatic.app/Contents/MacOS/OttoMatic"), ["--editor-data-root-version"], path.join(root(), "OttoMatic.app/Contents/MacOS"));
  });

  it.each(gameIdSchema.options)
  ("uses the AppImage wrapper for the %s AppDir compatibility probe and launch path", async (name) => {
    await writeFixture(root(), `package/usr/bin/${name}`, "ELF fixture needing bundled SDL");
    await writeFixture(root(), "package/Data/System/file", "stock");
    await writeFixture(root(), "package/AppRun", "wrapper fixture");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2\n"));
    const found = await findInstallation(root(), name);
    expect(found.isOk() && found.value).toEqual({ executable: path.join(root(), "package/AppRun"), data: path.join(root(), "package/Data") });
    expect(probe).toHaveBeenCalledExactlyOnceWith(path.join(root(), "package/AppRun"), ["--editor-data-root-version"], path.join(root(), "package"));
  });

  it.each([ok("1"), err({ code: "launch", message: "Missing bundled dependency" })])
  ("rejects incompatible AppImage wrappers without probing the raw ELF: %j", async (reply) => {
    await writeFixture(root(), "usr/bin/OttoMatic", "ELF fixture");
    await writeFixture(root(), "Data/System/file", "stock");
    await writeFixture(root(), "AppRun", "wrapper fixture");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(reply);
    expect((await findInstallation(root(), "OttoMatic")).isErr()).toBe(true);
    expect(probe).toHaveBeenCalledExactlyOnceWith(path.join(root(), "AppRun"), ["--editor-data-root-version"], root());
  });

  it.skipIf(process.platform === "win32")("executes a real AppRun wrapper that supplies its runtime environment", async () => {
    await writeFixture(root(), "package/Data/System/file", "stock");
    await writeFixture(root(), "package/usr/bin/OttoMatic", [
      "#!/bin/sh",
      '[ "$PANGEA_WRAPPER_FIXTURE" = "ready" ] || exit 1',
      '[ -d "Data/System" ] || exit 2',
      '[ "$1" = "--editor-data-root-version" ] || exit 3',
      "printf '2\\n'",
    ].join("\n"));
    await writeFixture(root(), "package/AppRun", [
      "#!/bin/sh",
      'cd "$(dirname "$0")" || exit 1',
      "export PANGEA_WRAPPER_FIXTURE=ready",
      'exec ./usr/bin/OttoMatic "$@"',
    ].join("\n"));
    for (const relative of ["package/AppRun", "package/usr/bin/OttoMatic"]) {
      expect((await io(() => fs.chmod(path.join(root(), relative), 0o755), "Cannot make fixture executable")).isOk()).toBe(true);
    }
    const direct = await processes.runProcess(path.join(root(), "package/usr/bin/OttoMatic"), ["--editor-data-root-version"], root());
    expect(direct.isErr()).toBe(true);
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk() && found.value).toEqual({ executable: path.join(root(), "package/AppRun"), data: path.join(root(), "package/Data") });
  });

  it.skipIf(process.platform === "win32")("rejects a native compatibility probe when Lua scripting is disabled", async () => {
    await writeFixture(root(), "Data/System/file", "stock");
    await writeFixture(root(), "OttoMatic", ["#!/bin/sh",
      "printf 'This build does not include editor Lua scripting contract version 2\\n' >&2", "exit 2"].join("\n"));
    expect((await io(() => fs.chmod(path.join(root(), "OttoMatic"), 0o755), "Cannot prepare disabled-runtime fixture")).isOk()).toBe(true);
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isErr() && found.error.code).toBe("incompatible");
  });

  it.each(["missing-wrapper", "directory-wrapper", "symlink-wrapper", "symlink-data", "symlink-binary", "wrong-game"])
  ("rejects unsafe or incomplete AppDir layouts: %s", async (kind) => {
    if (kind === "symlink-binary") {
      await writeFixture(root(), "usr/bin/binary", "ELF fixture");
      await fs.symlink(path.join(root(), "usr/bin/binary"), path.join(root(), "usr/bin/OttoMatic"));
    } else await writeFixture(root(), `usr/bin/${kind === "wrong-game" ? "Bugdom" : "OttoMatic"}`, "ELF fixture");
    await writeFixture(root(), "stock/System/file", "stock");
    if (kind === "symlink-data") await fs.symlink(path.join(root(), "stock"), path.join(root(), "Data"), "junction");
    else await writeFixture(root(), "Data/System/file", "stock");
    if (kind === "symlink-wrapper") {
      await writeFixture(root(), "wrapper", "wrapper fixture");
      await fs.symlink(path.join(root(), "wrapper"), path.join(root(), "AppRun"));
    } else if (kind === "directory-wrapper") await fs.mkdir(path.join(root(), "AppRun"));
    else if (kind !== "missing-wrapper") await writeFixture(root(), "AppRun", "wrapper fixture");
    const probe = vi.spyOn(processes, "runProcess");
    expect((await findInstallation(root(), "OttoMatic")).isErr()).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it.each([6, 7])("keeps AppDir discovery within the maximum nesting depth: %i", async (depth) => {
    const prefix = Array.from({ length: depth }, () => "nested").join("/");
    await writeFixture(root(), `${prefix}/usr/bin/OttoMatic`, "ELF fixture");
    await writeFixture(root(), `${prefix}/Data/System/file`, "stock");
    await writeFixture(root(), `${prefix}/AppRun`, "wrapper fixture");
    const probe = vi.spyOn(processes, "runProcess").mockResolvedValue(ok("2"));
    const found = await findInstallation(root(), "OttoMatic");
    expect(found.isOk()).toBe(depth === 6);
    expect(probe).toHaveBeenCalledTimes(depth === 6 ? 1 : 0);
  });

  it.each([ok("1"), ok("3"), ok(""), ok("2\nother output"), err({ code: "launch", message: "Incompatible" })])
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
