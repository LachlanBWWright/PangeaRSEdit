import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { desktopProjectAtom } from "./projectState";
import { openExternalProjectFile } from "./ProjectFilesDialog";

export function DesktopScriptSource({ path, content, initialLine }: { path: string; content: string; initialLine?: number }) {
  const project = useAtomValue(desktopProjectAtom);
  const exists = project?.files.some((file) => file.path === path) ?? false;
  return <section className="grid gap-3 min-w-0">
    <p className="workbench-source-path">{path}</p>
    <p className="workbench-muted">Edit Lua in your external editor. Save All writes new helpers, API types and LuaLS settings to the project. Saved external changes reload and compile automatically when this workspace is clean.</p>
    <div className="flex flex-wrap gap-2"><Button disabled={!project} onClick={() => void openExternalProjectFile("edit")}>Open project in editor</Button>
      <Button variant="secondary" disabled={!exists} onClick={() => void openExternalProjectFile("edit", path, initialLine)}>Open file externally</Button>
      <Button variant="outline" disabled={!exists} onClick={() => void openExternalProjectFile("reveal", path)}>Reveal file</Button></div>
    {!exists && <p role="status" className="text-sm text-amber-300">Save the project before opening this file externally.</p>}
    <pre aria-label="Lua source preview" className="max-h-[450px] overflow-auto rounded border bg-slate-950 p-4 text-xs"><code>{content}</code></pre>
  </section>;
}
