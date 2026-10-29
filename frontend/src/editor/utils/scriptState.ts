import { err, ok, Result, type ResultAsync } from "neverthrow";
import { encodeScriptStatePath, scriptStatePageSchema, scriptStateQuerySchema, type ScriptStatePage, type ScriptStateQuery } from "@pangea/desktop-contracts";
import { z } from "zod";

export type QueryScriptState = (query: ScriptStateQuery) => Result<ScriptStatePage, string> | ResultAsync<ScriptStatePage, string>;
interface StateRuntime { ccall?: (name: string, result: string | null, types: string[], args: unknown[]) => unknown }
export function queryScriptState(module: StateRuntime | null, query: ScriptStateQuery): Result<ScriptStatePage, string> {
  if (!module?.ccall) return err("Launch a game to inspect instance state.");
  const valid = scriptStateQuerySchema.safeParse(query);
  if (!valid.success) return err("Invalid instance state path.");
  const called = Result.fromThrowable(() => module.ccall?.("PangeaScript_GetObjectStateInspectorJSON", "string", ["number", "number", "string", "number", "number"], [query.handle.id, query.handle.generation, encodeScriptStatePath(query.path), query.offset, 32]), () => "Rebuild this game to inspect nested instance state.")();
  if (called.isErr()) return err(called.error);
  const text = z.string().safeParse(called.value);
  if (!text.success) return err("Invalid native state response.");
  const decoded = Result.fromThrowable((): unknown => JSON.parse(text.data), () => "Invalid native state JSON.")();
  if (decoded.isErr()) return err(decoded.error);
  const page = scriptStatePageSchema.safeParse(decoded.value);
  if (!page.success) return err("Unsupported native state format.");
  if (page.data.error) return err(page.data.error);
  if (page.data.nextOffset !== null && page.data.nextOffset <= page.data.offset) return err("Native state pagination did not advance.");
  return ok(page.data);
}
