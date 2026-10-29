import { LuaFactory } from "wasmoon";
import { err, errAsync, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { buildLuaValidationProgram } from "./scriptLuaValidationProgram";
import {
  luaValidationEngineFailure,
  luaValidationResponseSchema,
  type LuaValidationDiagnostic,
  type LuaValidationInput,
} from "./scriptLuaValidationTypes";

function boundaryFailure(value: unknown): readonly LuaValidationDiagnostic[] {
  const parsed = z.object({ message: z.string() }).safeParse(value);
  return luaValidationEngineFailure(parsed.success
    ? parsed.data.message
    : "The Lua 5.4 validation engine could not complete validation.");
}

export function validateLuaWorkspaceEngine(
  input: LuaValidationInput,
  wasmUri?: string,
  onReady?: () => void,
): ResultAsync<undefined, readonly LuaValidationDiagnostic[]> {
  const create = Result.fromThrowable(() => new LuaFactory(wasmUri), boundaryFailure);
  const factory = create();
  if (factory.isErr()) return errAsync(factory.error);
  return ResultAsync.fromPromise(factory.value.createEngine({
    openStandardLibs: true,
    injectObjects: false,
    enableProxy: false,
    traceAllocations: true,
  }), boundaryFailure).andThen((engine) => {
    onReady?.();
    const program = buildLuaValidationProgram(input);
    const execute = Result.fromThrowable(() => {
      engine.global.setMemoryMax(8 * 1024 * 1024);
      const output: unknown = engine.doStringSync(program);
      return output;
    }, boundaryFailure);
    const output = execute();
    const close = Result.fromThrowable(() => engine.global.close(), boundaryFailure);
    const closed = close();
    if (output.isErr()) return err(output.error);
    if (closed.isErr()) return err(closed.error);
    const parsed = luaValidationResponseSchema.safeParse(output.value);
    if (!parsed.success) return err(luaValidationEngineFailure("The Lua validation engine returned an invalid response."));
    return parsed.data.ok ? ok(undefined) : err(parsed.data.diagnostics);
  });
}
