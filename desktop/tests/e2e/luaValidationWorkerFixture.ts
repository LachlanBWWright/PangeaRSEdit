import fs from "node:fs/promises";
import path from "node:path";
import { err, ok, ResultAsync } from "neverthrow";
import type { Page } from "@playwright/test";
import { luaValidationResponseSchema, type LuaValidationInput } from "../../../frontend/src/editor/subviews/scripts/scriptLuaValidationTypes.ts";

export async function builtLuaValidationWorker() {
  const entries = await ResultAsync.fromPromise(
    fs.readdir(path.resolve("../frontend/dist-desktop/assets")),
    () => "Build the desktop frontend before running the Lua worker acceptance test.",
  );
  if (entries.isErr()) return err(entries.error);
  const workers = entries.value.filter((entry) => /^scriptLuaValidation\.worker-[\w-]+\.js$/.test(entry));
  return workers.length === 1 && workers[0]
    ? ok(`/assets/${workers[0]}`)
    : err("Expected exactly one built production Lua validation worker.");
}

export function validationInput(source: string): LuaValidationInput {
  const modulePath = "Data/Scripts/dist/modules/objects/actor.lua";
  return { modules: [{ path: modulePath, source }], behaviors: [{ modulePath, exportName: "Actor" }] };
}

export async function runRendererLuaWorker(page: Page, workerPath: string, input: LuaValidationInput) {
  const result = await ResultAsync.fromPromise(page.evaluate(async ({ workerPath, input }) => {
    const worker = new Worker(new URL(workerPath, window.location.href), { type: "module" });
    return new Promise<{ response: unknown; ready: boolean; terminated: boolean }>((resolve) => {
      let ready = false;
      let complete = false;
      const finish = (response: unknown) => {
        if (complete) return;
        complete = true;
        clearTimeout(timeout);
        worker.terminate();
        resolve({ response, ready, terminated: true });
      };
      const timeout = setTimeout(() => finish({ transportError: "Worker timed out" }), 20_000);
      worker.onerror = (event) => finish({ transportError: event.message });
      worker.onmessageerror = () => finish({ transportError: "Unreadable worker message" });
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (JSON.stringify(event.data) === '{"ready":true}') { ready = true; return; }
        finish(event.data);
      };
      worker.postMessage(input);
    });
  }, { workerPath, input }), () => "Electron could not launch the production worker under its protocol and CSP.");
  if (result.isErr()) return err(result.error);
  const parsed = luaValidationResponseSchema.safeParse(result.value.response);
  return parsed.success ? ok({ ...result.value, response: parsed.data })
    : err(`Invalid worker response: ${JSON.stringify(result.value.response)}`);
}
