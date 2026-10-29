import { z } from "zod";

export const luaValidationInputSchema = z.object({
  modules: z.array(z.object({ path: z.string(), source: z.string() })).readonly(),
  behaviors: z.array(z.object({ modulePath: z.string(), exportName: z.string() })).readonly(),
});

export const luaValidationDiagnosticSchema = z.object({
  filePath: z.string(),
  message: z.string(),
  phase: z.enum(["syntax", "module", "export", "engine"]),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
});

export const luaValidationResponseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({
    ok: z.literal(false),
    diagnostics: z.array(luaValidationDiagnosticSchema).min(1).readonly(),
  }),
]);

export const luaValidationWorkerMessageSchema = z.union([
  z.object({ ready: z.literal(true) }),
  luaValidationResponseSchema,
]);

export type LuaValidationInput = z.infer<typeof luaValidationInputSchema>;
export type LuaValidationDiagnostic = z.infer<typeof luaValidationDiagnosticSchema>;
export type LuaValidationResponse = z.infer<typeof luaValidationResponseSchema>;
export type LuaValidationWorkerMessage = z.infer<typeof luaValidationWorkerMessageSchema>;

export function luaValidationEngineFailure(message: string): readonly LuaValidationDiagnostic[] {
  return [{ filePath: "", message, phase: "engine" }];
}
