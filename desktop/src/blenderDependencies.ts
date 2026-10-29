import path from "node:path";
import os from "node:os";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { HostError } from "@pangea/desktop-contracts";
import { failure, io, parseJson } from "./files.ts";
import { startProcess } from "./processes.ts";

const marker = "PANGEA_BLEND_DEPENDENCIES:";
const dependencySchema = z.array(z.string().min(1).max(32_768)).max(4096);
// Asset-browser brush references are not loaded libraries or model dependencies.
const dependencyExpression = [
  "def external_paths():",
  " libraries={os.path.normpath(bpy.path.abspath(lib.filepath)) for lib in bpy.data.libraries}",
  " paths={os.path.normpath(p) for p in bpy.utils.blend_paths(absolute=True,packed=False,local=False) if p}",
  " return sorted(p for p in paths if not p.lower().endswith('.blend') or p in libraries)",
].join("\n");
const inspectExpression = [
  "import bpy,json,os,sys",
  dependencyExpression,
  "paths=external_paths()",
  "missing=[p for p in paths if not os.path.isfile(p)]",
  "if missing: print('Missing or unsupported Blender dependency: '+', '.join(missing),file=sys.stderr); sys.exit(1)",
  `print('${marker}'+json.dumps(paths))`,
].join("\n");
const packExpression = [
  "import bpy,json,os,sys",
  dependencyExpression,
  "output=sys.argv[sys.argv.index('--')+1]",
  "replacements=json.loads(sys.argv[sys.argv.index('--')+2])",
  "paths=external_paths()",
  "missing=[p for p in paths if not os.path.isfile(p)]",
  "if missing: print('Missing or unsupported Blender dependency: '+', '.join(missing),file=sys.stderr); sys.exit(1)",
  "for library in list(bpy.data.libraries):",
  " replacement=replacements.get(os.path.normpath(bpy.path.abspath(library.filepath)))",
  " if replacement: library.filepath=bpy.path.relpath(replacement); library.reload()",
  "bpy.ops.file.pack_all()",
  "bpy.ops.file.pack_libraries()",
  "remaining=external_paths()",
  "if remaining: print('These Blender dependencies cannot be packed: '+', '.join(remaining)+'. Export a GLB or pack them in Blender.',file=sys.stderr); sys.exit(1)",
  "bpy.context.preferences.filepaths.save_version=0",
  "bpy.ops.wm.save_as_mainfile(filepath=output,check_existing=False,copy=True)",
].join("\n");

export function blendDependencyArguments(source: string, output?: string, libraries: Record<string, string> = {}): string[] {
  return ["--background", "--factory-startup", "--disable-autoexec", source,
    "--python-exit-code", "1", "--python-expr", output ? packExpression : inspectExpression,
    ...(output ? ["--", output, JSON.stringify(libraries)] : [])];
}

export function parseBlendDependencies(output: string): Result<string[], HostError> {
  const line = output.split(/\r?\n/u).findLast((entry) => entry.startsWith(marker));
  if (!line) return err(failure("Blender did not report its external dependencies", "conversion"));
  const json = parseJson(line.slice(marker.length));
  if (json.isErr()) return err(json.error);
  const parsed = dependencySchema.safeParse(json.value);
  if (!parsed.success || parsed.data.some((entry) => !path.isAbsolute(entry)))
    return err(failure("Blender returned invalid external dependency paths", "invalid"));
  return ok([...new Set(parsed.data.map((entry) => path.normalize(entry)))].sort());
}

async function runDependencyOperation(source: string, executable: string, signal: AbortSignal,
  output?: string, libraries: Record<string, string> = {}): Promise<Result<string, HostError>> {
  if (signal.aborted) return err(failure("Asset import cancelled", "cancelled"));
  const started = startProcess(executable, blendDependencyArguments(source, output, libraries), path.dirname(source));
  if (started.isErr()) return err(started.error);
  return new Promise((resolve) => {
    const child = started.value;
    let stdout = "";
    let diagnostics = "";
    let timeoutReached = false;
    let outputExceeded = false;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      child.kill();
      forceTimer ??= setTimeout(() => child.kill("SIGKILL"), 2_000);
      forceTimer.unref();
    }
    const timeout = setTimeout(() => { timeoutReached = true; stop(); }, 300_000);
    function finish(result: Result<string, HostError>) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(forceTimer);
      signal.removeEventListener("abort", stop);
      resolve(result);
    }
    child.stdout?.on("data", (bytes: Buffer) => {
      if (outputExceeded) return;
      stdout += bytes.toString();
      if (stdout.length > 1024 * 1024) { outputExceeded = true; stop(); }
    });
    child.stderr?.on("data", (bytes: Buffer) => { diagnostics = (diagnostics + bytes.toString()).slice(-16_384); });
    child.once("error", () => finish(err(failure("Cannot start Blender. Check its configured executable.", "launch"))));
    child.once("close", (code) => {
      if (signal.aborted) return finish(err(failure("Asset import cancelled", "cancelled")));
      if (timeoutReached) return finish(err(failure("Blender dependency operation exceeded five minutes", "timeout")));
      if (outputExceeded) return finish(err(failure("Blender dependency report exceeds 1 MiB", "limit")));
      finish(code === 0 ? ok(stdout) : err(failure(`Blender dependency operation failed (${String(code)}): ${(stdout + diagnostics).slice(-16_384)}`, "conversion")));
    });
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
  });
}

export async function inspectBlendDependencies(source: string, executable: string,
  signal: AbortSignal): Promise<Result<string[], HostError>> {
  const result = await runDependencyOperation(source, executable, signal);
  return result.isErr() ? err(result.error) : parseBlendDependencies(result.value);
}

export async function packBlendSource(source: string, output: string, executable: string,
  signal: AbortSignal): Promise<Result<void, HostError>> {
  const temporary = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-blend-libraries-")), "Cannot stage Blender libraries");
  if (temporary.isErr()) return err(temporary.error);
  const context: LibraryPackingContext = { executable, signal, temporary: temporary.value, packed: new Map(), visiting: new Set() };
  const result = await packSourceTree(path.resolve(source), output, context);
  await io(() => fs.rm(temporary.value, { recursive: true, force: true }), "Cannot clean temporary Blender libraries");
  return result;
}

interface LibraryPackingContext {
  executable: string;
  signal: AbortSignal;
  temporary: string;
  packed: Map<string, string>;
  visiting: Set<string>;
}

async function packSourceTree(source: string, output: string, context: LibraryPackingContext): Promise<Result<void, HostError>> {
  if (context.visiting.has(source)) return err(failure("Blender libraries contain a circular link; resolve it before importing", "invalid"));
  if (context.visiting.size > 8 || context.packed.size > 64) return err(failure("Blender source exceeds eight library levels or 64 linked libraries", "limit"));
  const inspected = await inspectBlendDependencies(source, context.executable, context.signal);
  if (inspected.isErr()) return err(inspected.error);
  context.visiting.add(source);
  const libraries: Record<string, string> = {};
  for (const dependency of inspected.value.filter((entry) => path.extname(entry).toLowerCase() === ".blend")) {
    const previous = context.packed.get(dependency);
    if (previous) { libraries[dependency] = previous; continue; }
    const snapshot = path.join(context.temporary, `${randomUUID()}.blend`);
    const packed = await packSourceTree(dependency, snapshot, context);
    if (packed.isErr()) return err(packed.error);
    context.packed.set(dependency, snapshot);
    libraries[dependency] = snapshot;
  }
  context.visiting.delete(source);
  const result = await runDependencyOperation(source, context.executable, context.signal, output, libraries);
  return result.isErr() ? err(result.error) : ok(undefined);
}
