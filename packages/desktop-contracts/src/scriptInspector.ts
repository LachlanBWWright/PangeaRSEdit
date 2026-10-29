import { z } from "zod";

const count = z.number().int().nonnegative();
const handle = z.object({ id: z.number().int().positive(), generation: count });
const attribution = z.object({
  callback: z.string().max(64), source: z.string().max(128), line: count,
  object: handle.nullable(),
});
const frameDiagnostics = z.object({
  level: z.number().int(), frame: count, instructions: count, limit: count,
  entries: z.array(attribution.extend({ instructions: count })).max(32), truncated: z.boolean(),
  unattributedInstructions: count,
});
const elapsedMilliseconds = z.number().finite().nonnegative();
const nativeCostTotals = z.object({
  calls: count, milliseconds: elapsedMilliseconds, maxMilliseconds: elapsedMilliseconds, slowCalls: count,
});
const nativeCostWindow = nativeCostTotals.extend({
  capacity: z.literal(60), frames: count.max(60), level: z.number().int(),
  history: z.array(nativeCostTotals.extend({ frame: count })).max(60),
  entries: z.array(nativeCostTotals.extend({ source: z.string().max(128), object: handle.nullable() })).max(64),
  truncated: z.boolean(), sourceTruncated: z.boolean(), unattributedCalls: count,
  unattributedMilliseconds: elapsedMilliseconds,
});
const nativeFrameCosts = z.object({
  level: z.number().int(), frame: count, calls: count, milliseconds: elapsedMilliseconds,
  operations: z.array(z.object({
    operation: z.string().max(64), calls: count, milliseconds: elapsedMilliseconds,
    maxMilliseconds: elapsedMilliseconds, slowCalls: count,
    source: z.string().max(128), object: handle.nullable(),
  })).max(32),
});
export const scriptDiagnosticsSchema = z.object({
  lastFailure: attribution.extend({
    kind: z.enum(["none", "callback-error", "budget-exceeded", "rejected-command"]),
    message: z.string().max(512),
  }),
  frame: frameDiagnostics, previousFrame: frameDiagnostics.nullable(),
});
export type ScriptDiagnostics = z.infer<typeof scriptDiagnosticsSchema>;
const resourceLocation = z.object({ source: z.string().max(128), callback: z.string().max(64), line: count });
export const scriptObjectResourcesSchema = z.object({
  timeSeconds: elapsedMilliseconds,
  timers: z.object({ total: count, truncated: z.boolean(), entries: z.array(resourceLocation.extend({
    id: count, dueTimeSeconds: elapsedMilliseconds, repeating: z.boolean(), intervalSeconds: elapsedMilliseconds,
  })).max(128) }),
  tasks: z.object({ total: count, truncated: z.boolean(), entries: z.array(resourceLocation.extend({
    id: count, status: z.enum(["running", "sleeping", "ready"]), dueTimeSeconds: elapsedMilliseconds,
  })).max(64) }),
  subscriptions: z.object({ total: count, truncated: z.boolean(), entries: z.array(resourceLocation.extend({
    id: count, event: z.string().max(64), once: z.boolean(),
  })).max(128) }),
});
export type ScriptObjectResources = z.infer<typeof scriptObjectResourcesSchema>;
export const scriptInspectorObjectSchema = handle.extend({
  type: z.string().max(96), definition: z.string().max(96), controlled: z.boolean(), enabled: z.boolean(),
  owner: handle.nullable(), position: z.object({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
  state: z.record(z.string().max(96), z.string().max(256)).refine((fields) => Object.keys(fields).length <= 32),
  resources: scriptObjectResourcesSchema.optional(),
});
export const scriptInspectorSchema = z.object({
  nativeCosts: z.object({ current: nativeFrameCosts, previous: nativeFrameCosts, window: nativeCostWindow.optional() }).optional(),
  version: z.literal(1), enabled: z.boolean(), disabled: z.boolean(), rulesControlled: z.boolean(),
  errors: count, budgetOverruns: count, hooks: count, lastError: z.string().max(8192),
  commandRejections: count.optional(), callbackFailures: count.optional(),
  runtime: z.object({ memoryUsedBytes: count, memoryLimitBytes: count, timers: count, timerLimit: count,
    tasks: count, taskLimit: count, subscriptions: count, subscriptionLimit: count, frame: count,
    loadBudget: count, eventBudget: count, frameBudget: count, diagnostics: scriptDiagnosticsSchema.optional() }),
  registeredObjects: count, objects: z.array(scriptInspectorObjectSchema).max(64), truncated: z.boolean(),
});
export type ScriptInspectorSnapshot = z.infer<typeof scriptInspectorSchema>;
export const scriptInspectorPageSchema = z.object({
  objects: z.array(scriptInspectorObjectSchema).max(64), offset: count,
  nextOffset: count.nullable(), total: count, truncated: z.boolean(), error: z.string().nullable(),
});
export type ScriptInspectorPage = z.infer<typeof scriptInspectorPageSchema>;
