import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { HostError } from "@pangea/desktop-contracts";
import { failure } from "./files.ts";
import { startProcess } from "./processes.ts";

const exportExpression = [
  "import bpy,sys",
  "args=sys.argv[sys.argv.index('--')+1:]",
  "collection=bpy.data.collections.get(args[1]) if len(args)>1 else None",
  "if len(args)>1 and collection is None: print('Blender collection not found: '+args[1],file=sys.stderr); sys.exit(1)",
  "if collection is not None:",
  " bpy.ops.object.select_all(action='DESELECT')",
  " for obj in collection.all_objects: obj.select_set(True)",
  "bpy.ops.export_scene.gltf(filepath=args[0], export_format='GLB', export_animations=True, use_selection=collection is not None)",
].join("\n");

export function blenderArguments(source: string, output: string, collection?: string): string[] {
  return ["--background", "--factory-startup", "--disable-autoexec", source,
    "--python-exit-code", "1", "--python-expr", exportExpression, "--", output, ...(collection ? [collection] : [])];
}

export async function exportBlend(source: string, output: string, executable: string,
  signal: AbortSignal, collection?: string): Promise<Result<void, HostError>> {
  if (signal.aborted) return err(failure("Asset import cancelled", "cancelled"));
  const started = startProcess(executable, blenderArguments(source, output, collection), path.dirname(source));
  if (started.isErr()) return err(failure("Cannot start Blender. Configure its executable or export a GLB manually.", "launch"));
  return new Promise((resolve) => {
    const child = started.value;
    let diagnostics = "";
    let timedOut = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      child.kill();
      forceTimer ??= setTimeout(() => child.kill("SIGKILL"), 2_000);
      forceTimer.unref();
    }
    const timeout = setTimeout(() => { timedOut = true; stop(); }, 300_000);
    function finish(result: Result<void, HostError>) {
      clearTimeout(timeout);
      clearTimeout(forceTimer);
      signal.removeEventListener("abort", stop);
      resolve(result);
    }
    function collect(bytes: Buffer) { diagnostics = (diagnostics + bytes.toString()).slice(-16_384); }
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.once("error", () => finish(err(failure("Blender failed to start. Check its configured executable.", "launch"))));
    child.once("close", (code) => {
      if (signal.aborted) return finish(err(failure("Asset import cancelled", "cancelled")));
      if (timedOut) return finish(err(failure("Blender export exceeded five minutes", "timeout")));
      finish(code === 0 ? ok(undefined) : err(failure(`Blender export failed (${String(code)}): ${diagnostics}`, "conversion")));
    });
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
  });
}
