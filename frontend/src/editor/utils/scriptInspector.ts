import { err, ok, Result, type ResultAsync } from "neverthrow";
import { scriptInspectorSchema, scriptInspectorPageSchema, scriptInspectorObjectSchema, type ScriptInspectorSnapshot, type ScriptInspectorPage } from "@pangea/desktop-contracts";
import { z } from "zod";
interface InspectorRuntime {
  ccall?: (name: string, result: string | null, types: string[], args: unknown[]) => unknown;
}

export interface ScriptObjectQuery { offset: number; scriptedOnly: boolean; handle?: { id: number; generation: number } }
export type QueryScriptObjects = (query: ScriptObjectQuery) => Result<ScriptInspectorPage, string> | ResultAsync<ScriptInspectorPage, string>;

export function parseScriptObjectHandle(text: string): Result<{ id: number; generation: number }, string> {
  const parsed = z.string().regex(/^[1-9]\d*:\d+$/).safeParse(text.trim());
  if (!parsed.success) return err("Enter an object handle as id:generation.");
  const parts = parsed.data.split(":").map(Number);
  const handle = z.object({ id: z.number().int().positive().max(2147483647), generation: z.number().int().nonnegative().max(4294967295) }).safeParse({ id: parts[0], generation: parts[1] });
  return handle.success ? ok(handle.data) : err("Enter a valid object handle.");
}

export function queryScriptObjects(module: InspectorRuntime | null, query: ScriptObjectQuery): Result<ScriptInspectorPage, string> {
  if (!module?.ccall) return err("Launch a game to inspect script objects.");
  const name = query.handle ? "PangeaScript_GetObjectInspectorJSON" : "PangeaScript_GetObjectInspectorPageJSON";
  const args = query.handle ? [query.handle.id, query.handle.generation] : [query.offset, 64, Number(query.scriptedOnly)];
  const called = Result.fromThrowable(() => module.ccall?.(name, "string", args.map(() => "number"), args),
    () => "Rebuild this game runtime to browse all registered objects.")();
  if (called.isErr()) return err(called.error);
  const text = z.string().safeParse(called.value);
  if (!text.success) return err("The runtime did not return an object page.");
  const raw = Result.fromThrowable((): unknown => JSON.parse(text.data), () => "The runtime returned invalid object data.")();
  if (raw.isErr()) return err(raw.error);
  if (query.handle) {
    const single = z.object({ objects: z.array(scriptInspectorObjectSchema).max(1), error: z.string().nullable() }).safeParse(raw.value);
    if (!single.success) return err("The runtime returned an unsupported object format.");
    return single.data.error ? err(single.data.error) : ok({ ...single.data, offset: 0, nextOffset: null, total: single.data.objects.length, truncated: false });
  }
  const page = scriptInspectorPageSchema.safeParse(raw.value);
  if (!page.success) return err("The runtime returned an unsupported object page.");
  if (page.data.error) return err(page.data.error);
  if (page.data.nextOffset !== null && page.data.nextOffset <= page.data.offset) return err("The runtime returned a non-advancing object page.");
  return ok(page.data);
}

export function queryScriptInspector(module: InspectorRuntime | null): Result<ScriptInspectorSnapshot, string> {
  if (!module?.ccall) return err("Launch a game to inspect script objects.");
  const text = Result.fromThrowable(() => module.ccall?.("PangeaScript_GetStatusInspectorJSON", "string", [], []),
    () => "This game build does not expose the script inspector. Rebuild its runtime.")();
  if (text.isErr()) return err(text.error);
  const parsedText = z.string().safeParse(text.value);
  if (!parsedText.success) return err("This game build does not provide inspector snapshots.");
  const raw = Result.fromThrowable((): unknown => JSON.parse(parsedText.data), () => "The runtime returned invalid inspector data.")();
  if (raw.isErr()) return err(raw.error);
  const parsed = scriptInspectorSchema.safeParse(raw.value);
  return parsed.success ? ok(parsed.data) : err("This game build uses an unsupported inspector format.");
}
