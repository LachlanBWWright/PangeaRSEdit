import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { z } from "zod";
import { projectSnapshotSchema, type ProjectAssetBinding, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopRequest } from "./client";
import { desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { nativeAssetExtension } from "./projectAssetBindings";

export function AssetAssignmentsDialog() {
  const project = useAtomValue(desktopProjectAtom);
  return project ? <ProjectAssignments key={`${project.folder}:${project.manifest.game}`} project={project} /> : null;
}

function ProjectAssignments({ project }: { project: ProjectSnapshot }) {
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const setProject = useSetAtom(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const [targets, setTargets] = useState<{ path: string; size: number }[]>([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [scope, setScope] = useState("all");
  const [paletteOnly, setPaletteOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const disabled = busy || dirty || external !== null;
  const sources = project.files.filter((file) => /(?:\.(?:bg3d|3dmf|shapes|tga|tileset|png|wav|aiff|aif)|\.skeleton\.rsrc)$/i.test(file.path));
  const validSource = sources.some((file) => file.path === source);
  const validTarget = targets.some((file) => file.path === target && nativeAssetExtension(file.path) === nativeAssetExtension(source));
  const validLevels = levels.filter((id) => project.manifest.levels.some((level) => level.id === id));
  const validSelection = validSource && validTarget && (scope === "all" || validLevels.length > 0);
  async function loadTargets() {
    if (!project) return;
    setBusy(true); setError("");
    const result = await desktopRequest({ operation: "games.asset-files", game: project.manifest.game }, z.array(z.object({ path: z.string(), size: z.number() })));
    if (result.isErr()) setError(result.error.message); else setTargets(result.value);
    setBusy(false);
  }
  async function save(bindings: ProjectAssetBinding[]) {
    if (!project || disabled) return;
    setBusy(true);
    const result = await desktopRequest({ operation: "project.save", revision: project.revision,
      manifest: { ...project.manifest, assetBindings: bindings }, files: [], removed: [] }, projectSnapshotSchema);
    if (result.isErr()) toast.error(result.error.message); else {
      setProject((current) => current?.folder === project.folder ? result.value : current);
      toast.success("Asset assignments saved");
    }
    setBusy(false);
  }
  function add() {
    if (!validSelection) return;
    const scoped = scope === "all" ? [] : validLevels;
    const bindings = project.manifest.assetBindings ?? [];
    const overlap = bindings.some((binding) => binding.target === target && (!scoped.length || !binding.levels.length || scoped.some((id) => binding.levels.includes(id))));
    if (overlap) { toast.error("Remove the overlapping assignment for this target first"); return; }
    void save([...bindings, { source, target, levels: scoped, mode: paletteOnly && source.toLowerCase().endsWith(".tga") ? "palette" : "file" }]);
  }
  return <Dialog open={dialog === "assignments"} onOpenChange={(open) => { if (!open) setDialog(null); }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
    <DialogHeader><DialogTitle>Asset assignments</DialogTitle><DialogDescription>Replace stock game assets when testing or exporting this pack. Assign project models to custom objects from their Appearance panel.</DialogDescription></DialogHeader>
    {dirty && <p role="status">Save or discard your current document before changing assignments.</p>}
    <Button variant="outline" disabled={disabled} onClick={() => void loadTargets()}>Load targets from installed game</Button>
    {error && <p role="alert">{error}</p>}
    <label className="grid gap-1 text-sm">Project source asset<select className="rounded border bg-slate-900 p-2" value={source} disabled={disabled} onChange={(event) => { setSource(event.target.value); setTarget(""); setPaletteOnly(event.target.value.endsWith(".palette.tga")); }}><option value="">Choose source…</option>{sources.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Native replacement target<select className="rounded border bg-slate-900 p-2" value={target} disabled={disabled || !source} onChange={(event) => setTarget(event.target.value)}><option value="">Choose target…</option>{targets.filter((file) => nativeAssetExtension(file.path) === nativeAssetExtension(source)).map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label>
    {source.toLowerCase().endsWith(".tga") && <label className="flex gap-2 text-sm"><input type="checkbox" checked={paletteOnly} disabled={disabled} onChange={(event) => setPaletteOnly(event.target.checked)} />Replace palette colors only, preserving the target image pixels</label>}
    <fieldset className="grid gap-2 text-sm"><legend>Apply to levels</legend><select aria-label="Assignment scope" className="rounded border bg-slate-900 p-2" disabled={disabled} value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All levels</option><option value="selected">Selected levels</option></select>
      {scope === "selected" && project?.manifest.levels.map((level) => <label key={level.id} className="flex gap-2"><input type="checkbox" checked={levels.includes(level.id)} disabled={disabled} onChange={(event) => setLevels(event.target.checked ? [...levels, level.id] : levels.filter((id) => id !== level.id))} />{level.name}</label>)}
    </fieldset>
    <Button disabled={disabled || !validSelection} onClick={add}>Add assignment</Button>
    <div className="grid gap-3">{project?.manifest.assetBindings?.map((binding, index) => <div key={`${binding.target}-${index}`} className="grid gap-1 rounded border p-3 text-sm"><p className="break-all">{binding.source} → {binding.target}{binding.mode === "palette" ? " (palette only)" : ""}</p><p className="text-muted-foreground">{binding.levels.length ? binding.levels.map((id) => project.manifest.levels.find((level) => level.id === id)?.name ?? id).join(", ") : "All levels"}</p><Button variant="outline" disabled={disabled} onClick={() => void save(project.manifest.assetBindings?.filter((_entry, i) => i !== index) ?? [])}>Remove assignment</Button></div>)}</div>
  </DialogContent></Dialog>;
}
