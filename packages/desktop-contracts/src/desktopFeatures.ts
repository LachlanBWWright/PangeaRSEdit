import { z } from "zod";
import { scriptInspectorSchema } from "./scriptInspector.ts";

export const editorPreferencesSchema = z.object({
  editor: z.enum(["system", "vscode", "vscodium", "custom"]).default("system"),
  executable: z.string().optional(),
});
export type EditorPreferences = z.infer<typeof editorPreferencesSchema>;
export const gameRunSchema = z.object({
  id: z.string(), game: z.string(), state: z.enum(["starting", "running", "stopping", "exited", "failed"]),
  exitCode: z.number().nullable(), signal: z.string().nullable(), startedAt: z.string(),
  output: z.array(z.object({ sequence: z.number(), stream: z.enum(["stdout", "stderr", "host"]), text: z.string() })),
  droppedBytes: z.number(), canRestart: z.boolean(),
  sourceProject: z.string().nullable().default(null),
  inspector: scriptInspectorSchema.optional(),
});
export type GameRun = z.infer<typeof gameRunSchema>;
export const editorUpdateSchema = z.object({ current: z.string(), latest: z.string().nullable(), available: z.boolean(),
  url: z.string().nullable(), platform: z.string(), arch: z.string() });
