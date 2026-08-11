import { z } from "zod";

export const lspPositionSchema = z.object({
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
});

export const lspRangeSchema = z.object({
  start: lspPositionSchema,
  end: lspPositionSchema,
});

export const lspLocationSchema = z.object({
  uri: z.string(),
  range: lspRangeSchema,
});
export const lspLocationsSchema = z.union([
  lspLocationSchema,
  z.array(lspLocationSchema),
]);

const markupContentSchema = z.object({
  kind: z.string(),
  value: z.string(),
});

const markedStringSchema = z.object({
  language: z.string(),
  value: z.string(),
});

export const lspHoverSchema = z.object({
  contents: z.union([
    z.string(),
    markupContentSchema,
    markedStringSchema,
    z.array(z.union([z.string(), markupContentSchema, markedStringSchema])),
  ]),
  range: lspRangeSchema.optional(),
});

export const lspCompletionItemSchema = z.object({
  label: z.string(),
  kind: z.number().int().optional(),
  detail: z.string().optional(),
  documentation: z.union([z.string(), markupContentSchema]).optional(),
  insertText: z.string().optional(),
});

export const lspCompletionResultSchema = z.union([
  z.array(lspCompletionItemSchema),
  z.object({ items: z.array(lspCompletionItemSchema) }),
]);

export interface LspDocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  tags?: number[];
  range: LspRange;
  selectionRange: LspRange;
  children?: LspDocumentSymbol[];
}

export const lspDocumentSymbolSchema: z.ZodType<LspDocumentSymbol> = z.lazy(() =>
  z.object({
    name: z.string(),
    detail: z.string().optional(),
    kind: z.number().int(),
    tags: z.array(z.number().int()).optional(),
    range: lspRangeSchema,
    selectionRange: lspRangeSchema,
    children: z.array(lspDocumentSymbolSchema).optional(),
  }),
);

export const lspDiagnosticSchema = z.object({
  range: lspRangeSchema,
  severity: z.number().int().optional(),
  message: z.string(),
});

export const publishDiagnosticsParamsSchema = z.object({
  uri: z.string(),
  diagnostics: z.array(lspDiagnosticSchema),
});

export const lspMessageSchema = z.object({
  id: z.number().int().optional(),
  method: z.string().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
  params: z.unknown().optional(),
});

export type LspRange = z.infer<typeof lspRangeSchema>;
export type LspLocation = z.infer<typeof lspLocationSchema>;
export type LspCompletionItem = z.infer<typeof lspCompletionItemSchema>;
