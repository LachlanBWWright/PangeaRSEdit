import { Result } from "neverthrow";
import { z } from "zod";
import type { PreviewRuntimeModule } from "./gamePreviewRuntimeTypes";

export interface PangeaScriptStatusJS {
  enabled: boolean;
  configLoaded: boolean;
  bundleLoaded: boolean;
  activeScriptPath: string;
  lastError: string;
  errorCount: number;
  budgetExceededCount: number;
  hooksCalledCount: number;
  scriptsDisabled: boolean;
}

export function getRuntimeDiagnosticMessage(
  status: PangeaScriptStatusJS,
  lastReportedErrorCount: number,
): string | null {
  if (status.lastError) return status.lastError;
  if (status.errorCount > lastReportedErrorCount) {
    return `Scripting runtime reported an error (error count: ${String(status.errorCount)})`;
  }
  return null;
}

export function selectScriptingStatusModule(
  activeModule: PreviewRuntimeModule | null,
  globalModule: PreviewRuntimeModule | null,
): PreviewRuntimeModule | null {
  return activeModule ?? globalModule;
}

function readValue(
  module: PreviewRuntimeModule,
  ident: string,
  returnType: string,
  fallback: unknown,
): unknown {
  if (!module.ccall) return fallback;
  return Result.fromThrowable(
    () => module.ccall?.(ident, returnType, [], []),
    () => undefined,
  )().match(
    (value) => value ?? fallback,
    () => fallback,
  );
}

function readBoolean(module: PreviewRuntimeModule, ident: string): boolean {
  const parsed = z.coerce.boolean().safeParse(readValue(module, ident, "number", 0));
  return parsed.success ? parsed.data : false;
}

function readNumber(module: PreviewRuntimeModule, ident: string): number {
  const parsed = z.coerce.number().safeParse(readValue(module, ident, "number", 0));
  return parsed.success ? parsed.data : 0;
}

function readString(module: PreviewRuntimeModule, ident: string): string {
  const parsed = z.coerce.string().safeParse(readValue(module, ident, "string", ""));
  return parsed.success ? parsed.data : "";
}

export function queryScriptingStatus(
  module: PreviewRuntimeModule | null,
): PangeaScriptStatusJS | null {
  if (!module?.ccall) return null;
  return {
    enabled: readBoolean(module, "PangeaScript_GetStatusEnabled"),
    configLoaded: readBoolean(module, "PangeaScript_GetStatusConfigLoaded"),
    bundleLoaded: readBoolean(module, "PangeaScript_GetStatusBundleLoaded"),
    activeScriptPath: readString(module, "PangeaScript_GetStatusActiveScriptPath"),
    lastError: readString(module, "PangeaScript_GetStatusLastError"),
    errorCount: readNumber(module, "PangeaScript_GetStatusErrorCount"),
    budgetExceededCount: readNumber(module, "PangeaScript_GetStatusBudgetExceededCount"),
    hooksCalledCount: readNumber(module, "PangeaScript_GetStatusHooksCalledCount"),
    scriptsDisabled: readBoolean(module, "PangeaScript_GetStatusScriptsDisabled"),
  };
}
