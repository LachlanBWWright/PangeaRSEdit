import { spawn } from "node:child_process";
import { Result, err, ok, type Result as Outcome } from "neverthrow";
import { failure } from "./files.ts";
import type { HostError } from "@pangea/desktop-contracts";

export function startProcess(executable: string, args: string[], cwd: string) {
  return Result.fromThrowable(() => spawn(executable, args, {
    cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  }), () => failure("Cannot start executable", "launch"))();
}

export async function runProcess(executable: string, args: string[], cwd: string): Promise<Outcome<string, HostError>> {
  const child = startProcess(executable, args, cwd);
  if (child.isErr()) return err(child.error);
  return new Promise((resolve) => {
    let output = "";
    const timer = setTimeout(() => {
      child.value.kill();
      resolve(err(failure("Executable did not respond in time", "timeout")));
    }, 30_000);
    child.value.stdout?.on("data", (bytes: Buffer) => { output = (output + bytes.toString()).slice(-16_384); });
    child.value.stderr?.on("data", (bytes: Buffer) => { output = (output + bytes.toString()).slice(-16_384); });
    child.value.on("error", () => { clearTimeout(timer); resolve(err(failure("Executable failed to start", "launch"))); });
    child.value.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? ok(output) : err(failure(`Executable exited with ${String(code)}: ${output}`, "launch")));
    });
  });
}
