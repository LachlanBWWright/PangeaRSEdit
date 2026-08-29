import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { PreviewRuntimeModule } from "./gamePreviewRuntimeTypes";
import {
  getRuntimeDiagnosticMessage,
  queryScriptingStatus,
  selectScriptingStatusModule,
} from "./scriptRuntimeStatus";

function createModule(values: Readonly<Record<string, unknown>>): PreviewRuntimeModule {
  function ccall(
    ident: string,
    returnType: "number",
    _argTypes: string[],
    _args: unknown[],
  ): number;
  function ccall(
    ident: string,
    returnType: "string",
    _argTypes: string[],
    _args: unknown[],
  ): string;
  function ccall(
    ident: string,
    returnType: "boolean",
    _argTypes: string[],
    _args: unknown[],
  ): boolean;
  function ccall(
    ident: string,
    returnType: string | null,
    _argTypes: string[],
    _args: unknown[],
  ): unknown;
  function ccall(
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ): unknown {
    void argTypes;
    void args;
    const value = values[ident];
    if (returnType === "string") {
      return z.coerce.string().catch("").parse(value);
    }
    if (returnType === "boolean") {
      return z.coerce.boolean().catch(false).parse(value);
    }
    return z.coerce.number().catch(0).parse(value);
  }

  return {
    canvas: document.createElement("canvas"),
    arguments: [],
    preRun: [],
    locateFile: (path) => path,
    ccall,
  };
}

describe("queryScriptingStatus", () => {
  it("prefers detailed text and reports counter-only failures once", () => {
    const status = {
      enabled: true,
      configLoaded: true,
      bundleLoaded: true,
      activeScriptPath: "main.lua",
      lastError: "traceback",
      errorCount: 2,
      budgetExceededCount: 0,
      hooksCalledCount: 4,
      scriptsDisabled: false,
    };
    expect(getRuntimeDiagnosticMessage(status, 1)).toBe("traceback");
    expect(getRuntimeDiagnosticMessage({ ...status, lastError: "" }, 1)).toBe(
      "Scripting runtime reported an error (error count: 2)",
    );
    expect(getRuntimeDiagnosticMessage({ ...status, lastError: "" }, 2)).toBeNull();
  });

  it("prefers the active preview module over a stale global module", () => {
    const activeModule = createModule({
      PangeaScript_GetStatusEnabled: 1,
    });
    const globalModule = createModule({
      PangeaScript_GetStatusEnabled: 0,
    });

    expect(selectScriptingStatusModule(activeModule, globalModule)).toBe(
      activeModule,
    );
  });

  it("reads the complete runtime status", () => {
    const status = queryScriptingStatus(createModule({
      PangeaScript_GetStatusEnabled: 1,
      PangeaScript_GetStatusConfigLoaded: 1,
      PangeaScript_GetStatusBundleLoaded: 1,
      PangeaScript_GetStatusActiveScriptPath: "Data/Scripts/dist/main.lua",
      PangeaScript_GetStatusLastError: "runtime failure",
      PangeaScript_GetStatusErrorCount: 2,
      PangeaScript_GetStatusBudgetExceededCount: 1,
      PangeaScript_GetStatusHooksCalledCount: 9,
      PangeaScript_GetStatusScriptsDisabled: 0,
    }));

    expect(status).toEqual({
      enabled: true,
      configLoaded: true,
      bundleLoaded: true,
      activeScriptPath: "Data/Scripts/dist/main.lua",
      lastError: "runtime failure",
      errorCount: 2,
      budgetExceededCount: 1,
      hooksCalledCount: 9,
      scriptsDisabled: false,
    });
  });

  it("keeps status visible when one native field is unavailable", () => {
    const status = queryScriptingStatus(createModule({
      PangeaScript_GetStatusEnabled: 1,
      PangeaScript_GetStatusLastError: "traceback",
      PangeaScript_GetStatusBundleLoaded: undefined,
    }));

    expect(status?.enabled).toBe(true);
    expect(status?.bundleLoaded).toBe(false);
    expect(status?.lastError).toBe("traceback");
  });

  it("returns null before Emscripten exposes ccall", () => {
    expect(queryScriptingStatus({
      canvas: document.createElement("canvas"),
      arguments: [],
      preRun: [],
      locateFile: (path) => path,
    })).toBeNull();
  });
});
