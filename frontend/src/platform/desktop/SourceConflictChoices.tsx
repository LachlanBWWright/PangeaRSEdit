import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SourceConflictChoices({ paths, apply }: { paths: string[]; apply: (paths: string[]) => Promise<void> }) {
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  return <div className="grid gap-3">
    <p className="text-sm">Choose a version for each Lua file. Local level and object changes are retained. Save All then regenerates runtime output.</p>
    {paths.map((path) => <label key={path} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-all">{path}</span>
      <select aria-label={`Version for ${path}`} className="rounded border bg-slate-900 p-2" disabled={busy} value={choices[path] ? "disk" : "editor"} onChange={(event) => setChoices({ ...choices, [path]: event.target.value === "disk" })}><option value="editor">Keep editor</option><option value="disk">Use disk</option></select>
    </label>)}
    <Button disabled={busy} onClick={() => { setBusy(true); void apply(paths.filter((path) => choices[path])).then(() => setBusy(false)); }}>Apply file choices</Button>
  </div>;
}
