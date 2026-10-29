import { z } from "zod";

export const scriptStateKeySchema = z.union([z.string().max(256), z.number().finite()]);
export const scriptStateQuerySchema = z.object({
  handle: z.object({ id: z.number().int().positive().max(2147483647), generation: z.number().int().nonnegative().max(4294967295) }),
  path: z.array(scriptStateKeySchema).max(16),
  offset: z.number().int().nonnegative().max(2147483647),
});
export const scriptStatePageSchema = z.object({
  entries: z.array(z.object({ key: scriptStateKeySchema.nullable(), type: z.string().max(32), value: z.string().max(1024), expandable: z.boolean(), cycle: z.boolean(), truncated: z.boolean() })).max(64),
  offset: z.number().int().nonnegative(), nextOffset: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative(), truncated: z.boolean(), error: z.string().nullable(),
});
export type ScriptStateQuery = z.infer<typeof scriptStateQuerySchema>;
export type ScriptStatePage = z.infer<typeof scriptStatePageSchema>;

export function encodeScriptStatePath(path: ScriptStateQuery["path"]): string {
  return path.map((key) => {
    const text = z.string().safeParse(key);
    return text.success ? `s${Array.from(new TextEncoder().encode(text.data), (byte) => byte.toString(16).padStart(2, "0")).join("")}` : `n${key}`;
  }).join("/");
}
