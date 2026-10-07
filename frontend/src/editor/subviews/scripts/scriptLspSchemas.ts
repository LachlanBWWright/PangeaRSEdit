import { z } from "zod";

export const lspPositionSchema = z.object({
  line: z.number().int().nonnegative().max(2147483646),
  character: z.number().int().nonnegative().max(2147483646),
});

export const lspRangeSchema = z.object({
  start: lspPositionSchema,
  end: lspPositionSchema,
}).refine((range) => range.end.line > range.start.line || (range.end.line === range.start.line && range.end.character >= range.start.character), "LSP range ends before it starts");

export const lspLocationSchema = z.object({
  uri: z.string(),
  range: lspRangeSchema,
});
export const lspLocationsSchema = z.union([
  lspLocationSchema,
  z.array(lspLocationSchema),
]);

export const lspLocationLinkSchema = z.object({
  originSelectionRange: lspRangeSchema.optional(),
  targetUri: z.string(),
  targetRange: lspRangeSchema,
  targetSelectionRange: lspRangeSchema,
}).refine((link) => {
  const outer = link.targetRange;
  const inner = link.targetSelectionRange;
  return (inner.start.line > outer.start.line || (inner.start.line === outer.start.line && inner.start.character >= outer.start.character))
    && (inner.end.line < outer.end.line || (inner.end.line === outer.end.line && inner.end.character <= outer.end.character));
}, "Definition selection must be inside the target range");
export const lspDefinitionResultSchema = z.union([lspLocationSchema, z.array(lspLocationSchema), z.array(lspLocationLinkSchema)]);

const markupContentSchema = z.object({
  kind: z.enum(["plaintext", "markdown"]),
  value: z.string(),
});

const markedStringSchema = z.object({
  language: z.string(),
  value: z.string(),
});
export const lspMarkupContentSchema = markupContentSchema;
export const lspMarkedStringSchema = markedStringSchema;

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
  labelDetails: z.object({ detail: z.string().optional(), description: z.string().optional() }).optional(),
  insertTextFormat: z.union([z.literal(1), z.literal(2)]).optional(),
  insertTextMode: z.union([z.literal(1), z.literal(2)]).optional(),
  textEdit: z.union([
    z.object({ range: lspRangeSchema, newText: z.string() }),
    z.object({ insert: lspRangeSchema, replace: lspRangeSchema, newText: z.string() }),
  ]).optional(),
  textEditText: z.string().optional(),
  additionalTextEdits: z.array(z.object({ range: lspRangeSchema, newText: z.string() })).optional(),
  sortText: z.string().optional(), filterText: z.string().optional(), preselect: z.boolean().optional(),
  commitCharacters: z.array(z.string()).optional(),
  tags: z.array(z.number().int()).optional(), deprecated: z.boolean().optional(),
  data: z.unknown().optional(),
});

export const lspCompletionDefaultsSchema = z.object({
  commitCharacters: z.array(z.string()).optional(),
  editRange: z.union([lspRangeSchema, z.object({ insert: lspRangeSchema, replace: lspRangeSchema })]).optional(),
  insertTextFormat: z.union([z.literal(1), z.literal(2)]).optional(),
  insertTextMode: z.union([z.literal(1), z.literal(2)]).optional(),
  data: z.unknown().optional(),
});

export const lspCompletionResultSchema = z.union([
  z.array(lspCompletionItemSchema),
  z.object({ items: z.array(lspCompletionItemSchema), isIncomplete: z.boolean().optional(), itemDefaults: lspCompletionDefaultsSchema.optional() }),
]);

const lspParameterInformationSchema = z.object({
  label: z.union([z.string(), z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])]),
  documentation: z.union([z.string(), markupContentSchema]).optional(),
});
const lspSignatureInformationSchema = z.object({
  label: z.string(), documentation: z.union([z.string(), markupContentSchema]).optional(),
  parameters: z.array(lspParameterInformationSchema).optional(),
  activeParameter: z.number().int().nonnegative().optional(),
}).refine((signature) => (signature.parameters ?? []).every((parameter) => {
  if (!Array.isArray(parameter.label)) return true;
  return parameter.label[0] <= parameter.label[1] && parameter.label[1] <= signature.label.length;
}), "Signature parameter offsets must lie inside its label");
export const lspSignatureHelpSchema = z.object({
  signatures: z.array(lspSignatureInformationSchema),
  activeSignature: z.number().int().nonnegative().optional(), activeParameter: z.number().int().nonnegative().optional(),
});

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
export type LspCompletionDefaults = z.infer<typeof lspCompletionDefaultsSchema>;
export type LspCompletionResult = z.infer<typeof lspCompletionResultSchema>;
export type LspDefinitionResult = z.infer<typeof lspDefinitionResultSchema>;
export type LspHover = z.infer<typeof lspHoverSchema>;
export type LspSignatureHelp = z.infer<typeof lspSignatureHelpSchema>;
