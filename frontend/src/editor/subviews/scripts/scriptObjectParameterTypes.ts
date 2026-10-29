import { z } from "zod";

const identity = {
  id: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).max(64),
  label: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
};

export const scriptObjectParameterSchema = z.discriminatedUnion("kind", [
  z.object({ ...identity, kind: z.literal("number"), defaultValue: z.number().finite(), min: z.number().finite().optional(), max: z.number().finite().optional(), step: z.number().positive().finite().optional() }),
  z.object({ ...identity, kind: z.literal("boolean"), defaultValue: z.boolean() }),
  z.object({ ...identity, kind: z.literal("enum"), defaultValue: z.string(), options: z.array(z.object({ value: z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/).max(64), label: z.string().min(1).max(120) })).min(1) }),
]);

export const scriptObjectParameterValueSchema = z.union([z.number().finite(), z.boolean(), z.string()]);
export type ScriptObjectParameter = z.infer<typeof scriptObjectParameterSchema>;
export type ScriptObjectParameterValue = z.infer<typeof scriptObjectParameterValueSchema>;
