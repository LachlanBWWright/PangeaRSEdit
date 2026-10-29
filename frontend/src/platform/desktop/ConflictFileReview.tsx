import { conflictChoiceSchema, type ConflictFile } from "@pangea/desktop-contracts";
import type { z } from "zod";

export type FileChoice = z.infer<typeof conflictChoiceSchema>;
export function ConflictFileReview({ file, choice, onChange }: { file: ConflictFile; choice?: FileChoice; onChange: (choice: FileChoice) => void }) {
  const selected = choice?.choice ?? file.decision;
  const merged = choice?.text ?? file.merged ?? file.editor ?? file.disk ?? "";
  return <section className="grid gap-2 rounded border border-slate-700 p-3">
    <label className="grid gap-2 text-sm"><span className="break-all font-mono">{file.path}</span><select aria-label={`Version for ${file.path}`} className="rounded border bg-slate-900 p-2" value={selected} onChange={(event) => {
      const parsed = conflictChoiceSchema.shape.choice.safeParse(event.target.value);
      if (parsed.success) onChange({ path: file.path, choice: parsed.data, text: parsed.data === "merged" ? merged : undefined });
    }}><option value="unresolved" disabled>Choose a version…</option><option value="editor" disabled={!file.editorAvailable}>Editor{file.editorSize === null ? " (delete file)" : ` (${file.editorSize} bytes)`}</option>
      <option value="disk">Disk{file.diskSize === null ? " (delete file)" : ` (${file.diskSize} bytes)`}</option>{!file.binary && <option value="merged">Merged text</option>}
    </select></label>
    {file.reason && <p className="text-xs text-muted-foreground">{file.reason}</p>}
    {!file.binary && <details><summary className="cursor-pointer text-sm">Compare base, editor and disk</summary><div className="mt-2 grid gap-2 lg:grid-cols-3">
      <div><p className="text-xs">Base</p><pre aria-label={`Base content of ${file.path}`} className="max-h-60 overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-2 text-xs">{file.base ?? (file.baseAvailable ? "File did not exist" : "Baseline unavailable")}</pre></div>
      <div><p className="text-xs">Editor</p><pre aria-label={`Editor content of ${file.path}`} className="max-h-60 overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-2 text-xs">{file.editor ?? "Deleted"}</pre></div>
      <div><p className="text-xs">Disk</p><pre aria-label={`Disk content of ${file.path}`} className="max-h-60 overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-2 text-xs">{file.disk ?? "Deleted"}</pre></div>
    </div></details>}
    {selected === "merged" && !file.binary && <label className="grid gap-1 text-sm">Resolved text<textarea aria-label={`Merged content of ${file.path}`} className="min-h-36 rounded border bg-slate-950 p-2 font-mono text-xs" maxLength={262144} value={merged} onChange={(event) => onChange({ path: file.path, choice: "merged", text: event.target.value })} /></label>}
  </section>;
}
