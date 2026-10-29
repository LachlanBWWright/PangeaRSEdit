import { err, ok, Result } from "neverthrow";
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
  statusComplete: boolean;
}

const nativeBooleanSchema = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((value) => value === true || value === 1);
const counterSchema = z.number().int().nonnegative();
const runtimeStatusSchema = z.object({
  enabled: nativeBooleanSchema, configLoaded: nativeBooleanSchema, bundleLoaded: nativeBooleanSchema,
  activeScriptPath: z.string(), lastError: z.string(), errorCount: counterSchema,
  budgetExceededCount: counterSchema, hooksCalledCount: counterSchema, scriptsDisabled: nativeBooleanSchema,
});

function parsedField<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

const lifecycleTraceEntrySchema = z.object({
  eventId: z.string(),
  applicationPhase: z.string(),
  order: z.number().int().nonnegative(),
  targetId: z.number().int(),
  targetGeneration: z.number().int().nonnegative(),
  status: z.number().int(),
});

const lifecycleTraceSchema = z.object({
  eventCount: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
  overflow: z.boolean(),
  entries: z.array(lifecycleTraceEntrySchema),
});

export type PangeaScriptLifecycleTraceEntry = z.infer<
  typeof lifecycleTraceEntrySchema
>;

export type PangeaScriptLifecycleTrace = z.infer<typeof lifecycleTraceSchema>;

export interface LifecycleTraceComparison {
  readonly matches: boolean;
  readonly firstMismatchIndex: number | null;
  readonly reason: string | null;
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

export function queryScriptingStatus(
  module: PreviewRuntimeModule | null,
): PangeaScriptStatusJS | null {
  if (!module?.ccall) return null;
  const raw = {
    enabled: readValue(module, "PangeaScript_GetStatusEnabled", "number", undefined),
    configLoaded: readValue(module, "PangeaScript_GetStatusConfigLoaded", "number", undefined),
    bundleLoaded: readValue(module, "PangeaScript_GetStatusBundleLoaded", "number", undefined),
    activeScriptPath: readValue(module, "PangeaScript_GetStatusActiveScriptPath", "string", undefined),
    lastError: readValue(module, "PangeaScript_GetStatusLastError", "string", undefined),
    errorCount: readValue(module, "PangeaScript_GetStatusErrorCount", "number", undefined),
    budgetExceededCount: readValue(module, "PangeaScript_GetStatusBudgetExceededCount", "number", undefined),
    hooksCalledCount: readValue(module, "PangeaScript_GetStatusHooksCalledCount", "number", undefined),
    scriptsDisabled: readValue(module, "PangeaScript_GetStatusScriptsDisabled", "number", undefined),
  };
  const parsed = runtimeStatusSchema.safeParse(raw);
  if (parsed.success) return { ...parsed.data, statusComplete: true };
  return {
    enabled: parsedField(nativeBooleanSchema, raw.enabled, false),
    configLoaded: parsedField(nativeBooleanSchema, raw.configLoaded, false),
    bundleLoaded: parsedField(nativeBooleanSchema, raw.bundleLoaded, false),
    activeScriptPath: parsedField(z.string(), raw.activeScriptPath, ""),
    lastError: parsedField(z.string(), raw.lastError, ""),
    errorCount: parsedField(counterSchema, raw.errorCount, 0),
    budgetExceededCount: parsedField(counterSchema, raw.budgetExceededCount, 0),
    hooksCalledCount: parsedField(counterSchema, raw.hooksCalledCount, 0),
    scriptsDisabled: parsedField(nativeBooleanSchema, raw.scriptsDisabled, false),
    statusComplete: false,
  };
}

function parseLifecycleTraceJSON(raw: unknown): Result<PangeaScriptLifecycleTrace, string> {
  const rawText = z.string().safeParse(raw);
  if (!rawText.success) return err("Lifecycle trace export was not text");

  const parsedJSON = Result.fromThrowable(
    () => JSON.parse(rawText.data),
    () => "Lifecycle trace export was not valid JSON",
  )();
  if (parsedJSON.isErr()) return err(parsedJSON.error);

  const parsedTrace = lifecycleTraceSchema.safeParse(parsedJSON.value);
  return parsedTrace.success
    ? ok(parsedTrace.data)
    : err("Lifecycle trace export did not match the native schema");
}

export function queryLifecycleTrace(
  module: PreviewRuntimeModule | null,
): Result<PangeaScriptLifecycleTrace, string> {
  const ccall = module?.ccall;
  if (!ccall) return err("The preview runtime does not expose ccall");

  const result = Result.fromThrowable(
    () => ccall("PangeaScript_GetStatusLifecycleTraceJSON", "string", [], []),
    () => "The preview runtime could not export its lifecycle trace",
  )();
  return result.isErr() ? err(result.error) : parseLifecycleTraceJSON(result.value);
}

function normalizedTargetKey(entry: PangeaScriptLifecycleTraceEntry): string {
  if (entry.targetId <= 0 || entry.targetGeneration <= 0) return "none";
  return `${String(entry.targetId)}:${String(entry.targetGeneration)}`;
}

function normalizedEntries(
  trace: PangeaScriptLifecycleTrace,
): PangeaScriptLifecycleTraceEntry[] {
  const targetNumbers = new Map<string, number>();
  let nextTargetNumber = 1;
  return trace.entries.map((entry) => {
    const key = normalizedTargetKey(entry);
    if (key === "none") return { ...entry, targetId: 0, targetGeneration: 0 };
    const existingNumber = targetNumbers.get(key);
    if (existingNumber !== undefined) {
      return { ...entry, targetId: existingNumber, targetGeneration: 1 };
    }
    targetNumbers.set(key, nextTargetNumber);
    const normalizedEntry = {
      ...entry,
      targetId: nextTargetNumber,
      targetGeneration: 1,
    };
    nextTargetNumber += 1;
    return normalizedEntry;
  });
}

export function compareNormalizedLifecycleTraces(
  left: PangeaScriptLifecycleTrace,
  right: PangeaScriptLifecycleTrace,
): LifecycleTraceComparison {
  if (left.eventCount !== right.eventCount || left.entryCount !== right.entryCount) {
    return {
      matches: false,
      firstMismatchIndex: null,
      reason: "Lifecycle trace counts differ",
    };
  }
  if (left.overflow !== right.overflow) {
    return {
      matches: false,
      firstMismatchIndex: null,
      reason: "Lifecycle trace overflow states differ",
    };
  }
  const leftEntries = normalizedEntries(left);
  const rightEntries = normalizedEntries(right);
  const entryCount = Math.max(leftEntries.length, rightEntries.length);
  for (let index = 0; index < entryCount; index += 1) {
    const leftEntry = leftEntries[index];
    const rightEntry = rightEntries[index];
    if (!leftEntry || !rightEntry) {
      return {
        matches: false,
        firstMismatchIndex: index,
        reason: "Lifecycle trace lengths differ",
      };
    }
    if (
      leftEntry.eventId !== rightEntry.eventId ||
      leftEntry.applicationPhase !== rightEntry.applicationPhase ||
      leftEntry.order !== rightEntry.order ||
      leftEntry.targetId !== rightEntry.targetId ||
      leftEntry.targetGeneration !== rightEntry.targetGeneration ||
      leftEntry.status !== rightEntry.status
    ) {
      return {
        matches: false,
        firstMismatchIndex: index,
        reason: "Lifecycle trace entries differ",
      };
    }
  }
  return { matches: true, firstMismatchIndex: null, reason: null };
}
