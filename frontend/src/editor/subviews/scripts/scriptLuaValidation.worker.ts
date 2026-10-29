/// <reference lib="webworker" />

import { Result } from "neverthrow";
import wasmUri from "wasmoon/dist/glue.wasm?url";
import { validateLuaWorkspaceEngine } from "./scriptLuaValidationEngine";
import {
  luaValidationEngineFailure,
  luaValidationInputSchema,
  type LuaValidationWorkerMessage,
} from "./scriptLuaValidationTypes";

function sendResponse(response: LuaValidationWorkerMessage): void {
  Result.fromThrowable(() => self.postMessage(response), () => undefined)();
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsed = luaValidationInputSchema.safeParse(event.data);
  if (!parsed.success) {
    sendResponse({ ok: false, diagnostics: luaValidationEngineFailure("Invalid Lua validation request.") });
    return;
  }
  void validateLuaWorkspaceEngine(parsed.data, wasmUri, () => sendResponse({ ready: true })).match(
    () => sendResponse({ ok: true }),
    (diagnostics) => sendResponse({ ok: false, diagnostics }),
  );
};
