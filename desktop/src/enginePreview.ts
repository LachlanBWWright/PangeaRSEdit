import * as fs from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import type { ChildProcess } from "node:child_process";
import { err, ok, type Result } from "neverthrow";
import { enginePreviewFilesSchema, type EnginePreviewStatus, type HostError, type ProjectFile } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, projectPath } from "./files.ts";
import { startProcess } from "./processes.ts";

const buildMessage = "Build the native Lua Engine with python3 games/pangea-ports/games/PangeaSandbox/build.py --dependencies --configure --build, then retry.";

interface PreviewProcess { child: ChildProcess; closed: Promise<void>; directory: string }

export class EnginePreview {
  private active: PreviewProcess | null = null;
  private message = "Native preview is stopped.";
  private pending: Promise<unknown> = Promise.resolve();
  private disposed = false;

  constructor(private readonly executableCandidates: readonly string[], private readonly runRoot: string,
    private readonly userDataRoot: string, private readonly testHeadless = false, private readonly packaged = false) {}

  private unavailableMessage() {
    return this.packaged ? "This editor installation does not include the native Lua Engine. Install an editor release that includes the Engine to use native preview. Your package can still be edited and exported." : buildMessage;
  }

  private async executable(): Promise<string | null> {
    for (const candidate of this.executableCandidates) {
      const accessible = await io(() => fs.access(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK), "Cannot access native engine");
      if (accessible.isOk()) return candidate;
    }
    return null;
  }

  async status(): Promise<Result<EnginePreviewStatus, HostError>> {
    const executable = await this.executable();
    return ok({ running: this.active !== null, pid: this.active?.child.pid ?? null, available: executable !== null,
      message: executable ? this.message : this.unavailableMessage() });
  }

  launch(files: ProjectFile[]): Promise<Result<EnginePreviewStatus, HostError>> {
    const operation = this.pending.then(() => this.launchNow(files));
    this.pending = operation;
    return operation;
  }

  stop(): Promise<Result<EnginePreviewStatus, HostError>> {
    const operation = this.pending.then(async () => { await this.stopNow(); return this.status(); });
    this.pending = operation;
    return operation;
  }

  dispose(): void {
    this.disposed = true;
    this.active?.child.kill("SIGKILL");
  }

  async shutdown(): Promise<void> {
    this.disposed = true;
    await this.stop();
  }

  private async stopNow(): Promise<void> {
    const active = this.active;
    if (!active) return;
    active.child.kill();
    const force = setTimeout(() => active.child.kill("SIGKILL"), 1500);
    await active.closed;
    clearTimeout(force);
    this.message = "Native preview is stopped.";
  }

  private async launchNow(files: ProjectFile[]): Promise<Result<EnginePreviewStatus, HostError>> {
    if (this.disposed) return err(failure("The editor is closing", "cancelled"));
    const parsed = enginePreviewFilesSchema.safeParse(files);
    if (!parsed.success) return err(failure(parsed.error.issues[0]?.message ?? "Invalid engine package", "invalid"));
    const executable = await this.executable();
    if (!executable) return err(failure(this.unavailableMessage(), "unavailable"));
    await this.stopNow();
    const madeRoot = await io(() => fs.mkdir(this.runRoot, { recursive: true }), "Cannot create native preview directory");
    if (madeRoot.isErr()) return err(madeRoot.error);
    const temporary = await io(() => fs.mkdtemp(path.join(this.runRoot, "engine-")), "Cannot stage native preview");
    if (temporary.isErr()) return err(temporary.error);
    const directory = temporary.value;
    const staged = await this.stage(directory, parsed.data);
    if (staged.isErr() || this.disposed) {
      await this.cleanup(directory);
      return staged.isErr() ? err(staged.error) : err(failure("The editor is closing", "cancelled"));
    }
    const args = ["--package", path.join(directory, "package.json"), "--user-data", this.userDataRoot];
    if (this.testHeadless) args.push("--headless", "--frames", "10000000");
    const started = startProcess(executable, args, directory);
    if (started.isErr()) { await this.cleanup(directory); return err(started.error); }
    const child = started.value;
    let output = "";
    child.stdout?.on("data", (bytes: Buffer) => { output = (output + bytes.toString()).slice(-4096); });
    child.stderr?.on("data", (bytes: Buffer) => { output = (output + bytes.toString()).slice(-4096); });
    const closed = new Promise<void>((resolve) => child.once("close", (code, signal) => {
      if (this.active?.child === child) {
        this.active = null;
        this.message = code === 0 || signal ? "Native preview is stopped." : `Native preview exited (${String(code)}). ${output}`;
      }
      void this.cleanup(directory).then(resolve);
    }));
    const spawned = await new Promise<Result<void, HostError>>((resolve) => {
      child.once("error", () => resolve(err(failure("Native engine failed to launch. " + this.unavailableMessage(), "launch"))));
      child.once("spawn", () => resolve(ok(undefined)));
    });
    if (spawned.isErr()) { await closed; return err(spawned.error); }
    this.active = { child, closed, directory };
    this.message = "Native preview is running.";
    if (this.disposed) await this.stopNow();
    return this.status();
  }

  private async stage(directory: string, files: ProjectFile[]): Promise<Result<void, HostError>> {
    for (const file of files) {
      const target = await projectPath(directory, file.path);
      if (target.isErr()) return err(target.error);
      const written = await atomicWrite(target.value, file.bytes);
      if (written.isErr()) return err(written.error);
    }
    return ok(undefined);
  }

  private async cleanup(directory: string): Promise<void> {
    await io(() => fs.rm(directory, { recursive: true, force: true }), "Cannot remove native preview directory");
  }
}
