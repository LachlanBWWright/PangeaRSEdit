import type * as monaco from "monaco-editor";
import { z } from "zod";
import type { LspHover, LspSignatureHelp, LspCompletionItem } from "./scriptLspSchemas";
import { lspMarkedStringSchema, lspMarkupContentSchema } from "./scriptLspSchemas";
import { mapLspRange } from "./scriptMonacoLspRanges";

export function mapLspDocumentation(documentation: LspCompletionItem["documentation"]): monaco.IMarkdownString | string | undefined {
  const text = z.string().safeParse(documentation);
  if (text.success) return text.data;
  const markup = lspMarkupContentSchema.safeParse(documentation);
  if (!markup.success) return undefined;
  return markup.data.kind === "markdown" ? { value: markup.data.value, isTrusted: false, supportHtml: false } : markup.data.value;
}
function hoverMarkdown(content: LspHover["contents"]): monaco.IMarkdownString[] {
  if (Array.isArray(content)) return content.flatMap(hoverMarkdown);
  const text = z.string().safeParse(content);
  if (text.success) return [{ value: text.data, isTrusted: false, supportHtml: false }];
  const code = lspMarkedStringSchema.safeParse(content);
  if (code.success) {
    const fenceLength = (code.data.value.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 2) + 1;
    const fence = "`".repeat(fenceLength);
    return [{ value: `${fence}${code.data.language.replace(/[^\w#+.-]/g, "")}\n${code.data.value}\n${fence}`, isTrusted: false, supportHtml: false }];
  }
  const markup = lspMarkupContentSchema.safeParse(content);
  if (!markup.success) return [];
  return [{ value: markup.data.kind === "markdown" ? markup.data.value : markup.data.value.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, "\\$&"), isTrusted: false, supportHtml: false }];
}
export function mapLspHover(hover: LspHover, fallbackRange: monaco.IRange): monaco.languages.Hover {
  return { range: hover.range ? mapLspRange(hover.range) : fallbackRange, contents: hoverMarkdown(hover.contents) };
}
function validIndex(index: number | undefined, length: number): number {
  return index !== undefined && index < length ? index : 0;
}
export function mapLspSignatureHelp(help: LspSignatureHelp): monaco.languages.SignatureHelpResult {
  const signatures = help.signatures.map((signature) => ({
    label: signature.label, documentation: mapLspDocumentation(signature.documentation),
    parameters: (signature.parameters ?? []).map((parameter) => ({ label: parameter.label, documentation: mapLspDocumentation(parameter.documentation) })),
    activeParameter: signature.activeParameter === undefined ? undefined : validIndex(signature.activeParameter, signature.parameters?.length ?? 0),
  }));
  const activeSignature = validIndex(help.activeSignature, signatures.length);
  const active = signatures[activeSignature];
  return { value: { signatures, activeSignature, activeParameter: active?.activeParameter ?? validIndex(help.activeParameter, active?.parameters.length ?? 0) }, dispose: () => undefined };
}
