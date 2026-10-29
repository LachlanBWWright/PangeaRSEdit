import { Result, ResultAsync, err, ok, type Result as ValidationResult } from "neverthrow";
import {
  luaValidationEngineFailure,
  luaValidationResponseSchema,
  luaValidationWorkerMessageSchema,
  type LuaValidationDiagnostic,
  type LuaValidationInput,
} from "./scriptLuaValidationTypes";

export interface LuaValidationWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: LuaValidationInput): void;
  terminate(): void;
}

type ValidationOutcome = ValidationResult<undefined, readonly LuaValidationDiagnostic[]>;

function createValidationWorker(): LuaValidationWorker {
  return new Worker(new URL("./scriptLuaValidation.worker.ts", import.meta.url), {
    type: "module",
  });
}

function parseValidationResponse(value: unknown): ValidationOutcome {
  const parsed = luaValidationResponseSchema.safeParse(value);
  if (!parsed.success) {
    return err(luaValidationEngineFailure("The Lua validator returned an invalid response."));
  }
  return parsed.data.ok ? ok(undefined) : err(parsed.data.diagnostics);
}

function runValidationWorker(worker: LuaValidationWorker, input: LuaValidationInput): ResultAsync<undefined, readonly LuaValidationDiagnostic[]> {
  const response = new Promise<ValidationOutcome>((resolve) => {
    let completed = false;
    let ready = false;
    const finish = (result: ValidationOutcome) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      Result.fromThrowable(() => worker.terminate(), () => undefined)();
      resolve(result);
    };
    // Keep engine downloads separate from the deadline for executing user code.
    let timeout = setTimeout(() => finish(err(luaValidationEngineFailure(
      "The Lua validation engine did not finish starting within 30 seconds.",
    ))), 30_000);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = luaValidationWorkerMessageSchema.safeParse(event.data);
      if (message.success && "ready" in message.data) {
        if (ready) return;
        ready = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => finish(err(luaValidationEngineFailure(
          "Lua validation timed out. Check for loops during module initialization.",
        ))), 5_000);
        return;
      }
      finish(parseValidationResponse(event.data));
    };
    worker.onerror = () => finish(err(luaValidationEngineFailure("The Lua validation worker failed.")));
    worker.onmessageerror = () => finish(err(luaValidationEngineFailure("The Lua validator response could not be read.")));
    const sent = Result.fromThrowable(
      () => worker.postMessage(input),
      () => luaValidationEngineFailure("The Lua validation request could not be sent."),
    )();
    if (sent.isErr()) finish(err(sent.error));
  });
  return ResultAsync.fromSafePromise(response).andThen((result) => result);
}

export function validateLuaWorkspace(
  input: LuaValidationInput,
  createWorker: () => LuaValidationWorker = createValidationWorker,
): ResultAsync<undefined, readonly LuaValidationDiagnostic[]> {
  const worker = Result.fromThrowable(
    createWorker,
    () => luaValidationEngineFailure("The Lua validation worker could not be started."),
  )();
  return worker.asyncAndThen((value) => runValidationWorker(value, input));
}
