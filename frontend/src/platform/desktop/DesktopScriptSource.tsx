import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { desktopProjectAtom } from "./projectState";
import { openExternalProjectFile } from "./ProjectFilesDialog";

export function DesktopScriptSource({ path, content, initialLine }: { path: string; content: string; initialLine?: number }) {
  const project = useAtomValue(desktopProjectAtom);
  const exists = project?.files.some((file) => file.path === path) ?? false;
  return <section className="desktop-script-source">
    <header className="workbench-source-toolbar"><p className="workbench-source-path">{path.replace("Data/Scripts/", "")}</p>
      <Button disabled={!exists} onClick={() => void openExternalProjectFile("edit", path, initialLine)}>Open file externally</Button></header>
    {!exists && <p role="status" className="text-sm text-amber-300">Save the project before opening this file externally.</p>}
    <pre aria-label="Lua source preview" className="script-code-surface overflow-auto bg-slate-950 p-4 text-xs"><code>{content}</code></pre>
    <details className="workbench-disclosure"><summary>External editing and project files</summary>
      <p>Save All writes the project to disk. Saved external changes reload and compile when there are no workspace changes.</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={!project} onClick={() => void openExternalProjectFile("edit")}>Open project in editor</Button>
        <Button size="sm" variant="ghost" disabled={!exists} onClick={() => void openExternalProjectFile("reveal", path)}>Reveal file</Button></div>
    </details>
  </section>;
}
