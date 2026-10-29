import * as fs from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { err, ok, type Result } from "neverthrow";
import type { HostError, Installation, ProjectFile } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, projectPath } from "./files.ts";
import { startProcess } from "./processes.ts";
import type { LaunchObserver } from "./gameRuns.ts";

export function validLaunchArguments(args: string[]): boolean {
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--level", "--track", "--car"].includes(flag ?? "") || !value || !/^\d{1,3}(?::\d{1,2})?$/.test(value)) return false;
  }
  return true;
}

export async function launchGame(installation: Installation, runRoot: string, files?: ProjectFile[], args: string[] = [], onExit: () => void = () => undefined, observer?: LaunchObserver): Promise<Result<void, HostError>> {
  if (!validLaunchArguments(args)) return err(failure("Unsupported game launch arguments", "invalid"));
  let cwd = path.dirname(installation.executable);
  let launchArgs: string[] = [];
  if (files) {
    const created = await io(() => fs.mkdir(runRoot, { recursive: true }), "Cannot prepare test directory");
    if (created.isErr()) return err(created.error);
    const copied = await io(() => fs.cp(installation.data, path.join(runRoot, "Data"), {
      recursive: true, dereference: true, mode: constants.COPYFILE_FICLONE,
    }), "Cannot prepare isolated game assets");
    if (copied.isErr()) return err(copied.error);
    for (const file of files) {
      if (!file.path.startsWith("Data/")) return err(failure("Test files must be inside Data", "invalid"));
      const target = await projectPath(runRoot, file.path);
      if (target.isErr()) return err(target.error);
      const written = await atomicWrite(target.value, file.bytes);
      if (written.isErr()) return err(written.error);
    }
    cwd = runRoot;
    launchArgs = ["--data-dir", path.join(runRoot, "Data"), ...args];
  }
  const inspectorRequest = files ? path.join(runRoot, ".pangea-inspector-request") : undefined;
  const child = startProcess(installation.executable, launchArgs, cwd, files ? { PANGEA_SCRIPT_INSPECTOR: "1", PANGEA_SCRIPT_INSPECTOR_REQUEST: inspectorRequest ?? "" } : undefined);
  if (child.isErr()) return err(child.error);
  return new Promise((resolve) => {
    let spawned = false;
    child.value.once("spawn", () => { spawned = true; observer?.spawn(child.value, inspectorRequest); resolve(ok(undefined)); });
    child.value.once("error", () => resolve(err(failure("Game failed to launch", "launch"))));
    if (!observer) { child.value.stdout?.resume(); child.value.stderr?.resume(); }
    child.value.once("close", (code, signal) => {
      if (spawned) observer?.exit(code, signal);
      if (spawned) onExit();
      if (files) void io(() => fs.rm(runRoot, { recursive: true, force: true }), "Cannot clean test snapshot");
    });
  });
}
