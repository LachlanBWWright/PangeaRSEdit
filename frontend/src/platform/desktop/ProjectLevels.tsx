import { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desktopLevelIdAtom, desktopProjectAtom, desktopProjectDirtyAtom, desktopProjectDialogAtom } from "./projectState";
import { changeProjectLevel, type LevelAction } from "./projectManagement";

export function ProjectLevels() {
  const navigate = useNavigate();
  const [project, setProject] = useAtom(desktopProjectAtom);
  const [levelId, setLevelId] = useAtom(desktopLevelIdAtom);
  const [, setDialog] = useAtom(desktopProjectDialogAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  async function change(id: string, action: LevelAction, name: string) {
    if (!project || busy || dirty) return;
    setBusy(true);
    const result = await changeProjectLevel(project, id, action, name);
    if (result.isErr()) toast.error(result.error);
    else { setProject(result.value); if (action === "delete" && id === levelId) setLevelId(result.value.manifest.levels[0]?.id ?? null); }
    setConfirmDelete(null);
    setBusy(false);
  }
  return <div className="grid gap-3 max-h-[65vh] overflow-auto">
    {dirty && <p role="status" className="text-sm text-amber-300">Save or discard edits before managing levels.</p>}
    {!project?.manifest.levels.length && <p className="text-sm text-muted-foreground">Create or upload a level, then use Save All to add it to this project.</p>}
    {project?.manifest.levels.map((level, index) => <div key={level.id} className="grid gap-2 rounded border p-3">
      <Button aria-pressed={level.id === levelId} variant={level.id === levelId ? "secondary" : "ghost"} disabled={dirty || busy} onClick={() => { setLevelId(level.id); setDialog(null); navigate("/"); }}>{level.name}</Button>
      <label className="grid gap-1 text-sm">Level name<input className="rounded border bg-slate-900 p-2" maxLength={120} value={names[level.id] ?? level.name} disabled={dirty || busy} onChange={(event) => setNames({ ...names, [level.id]: event.target.value })} /></label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={dirty || busy} onClick={() => void change(level.id, "rename", names[level.id] ?? level.name)}>Rename</Button>
        <Button size="sm" disabled={dirty || busy} onClick={() => void change(level.id, "duplicate", level.name)}>Duplicate</Button>
        <Button size="sm" disabled={dirty || busy || index === 0} onClick={() => void change(level.id, "up", level.name)}>Move up</Button>
        <Button size="sm" disabled={dirty || busy || index === project.manifest.levels.length - 1} onClick={() => void change(level.id, "down", level.name)}>Move down</Button>
        <Button size="sm" variant="destructive" disabled={dirty || busy} onClick={() => setConfirmDelete(level.id)}>Delete</Button>
      </div>
      {confirmDelete === level.id && <div role="alert" className="grid gap-2 text-sm"><p>Delete this level and its saved files? Shared scripts and assets are retained.</p><div className="flex gap-2"><Button variant="destructive" disabled={busy || dirty} onClick={() => void change(level.id, "delete", level.name)}>Confirm delete</Button><Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button></div></div>}
    </div>)}
  </div>;
}
