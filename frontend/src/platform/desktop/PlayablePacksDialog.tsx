import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { z } from "zod";
import { installedPackSchema, projectSnapshotSchema, type InstalledPack } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopExternalProjectAtom, desktopLevelIdAtom, desktopProjectAtom, desktopProjectDialogAtom, desktopProjectDirtyAtom } from "./projectState";
import { prepareProjectPack } from "./projectPackExport";

export function PlayablePacksDialog() {
  const [dialog, setDialog] = useAtom(desktopProjectDialogAtom);
  const [project, setProject] = useAtom(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const document = useAtomValue(desktopActiveDocumentAtom);
  const setExternal = useSetAtom(desktopExternalProjectAtom), setLevelId = useSetAtom(desktopLevelIdAtom);
  const [packs, setPacks] = useState<InstalledPack[]>([]);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<Record<string, string>>({});
  const [includeEditableProject, setIncludeEditableProject] = useState(false);
  const [includeAuthoringSources, setIncludeAuthoringSources] = useState(false);
  useEffect(() => {
    if (dialog !== "packs") return;
    void desktopRequest({ operation: "packs.list" }, z.array(installedPackSchema)).then((result) => { if (result.isOk()) setPacks(result.value); });
  }, [dialog]);
  async function exportPack() {
    if (!project || busy || dirty || external) return;
    setBusy(true); setStatus("Preparing saved project…");
    const prepared = await prepareProjectPack(project, setStatus);
    if (prepared.isErr()) { setStatus(prepared.error); setBusy(false); return; }
    const saved = await desktopRequest({ operation: "packs.export", revision: project.revision, levels: prepared.value,
      includeEditableProject, includeAuthoringSources: includeEditableProject && includeAuthoringSources }, z.void());
    if (saved.isErr()) { if (saved.error.code !== "cancelled") setStatus(saved.error.message); else setStatus("Export cancelled"); }
    else setStatus(includeEditableProject ? "Playable pack exported with editable project files, checksums and launch instructions."
      : "Playable pack exported with runtime files, checksums and launch instructions.");
    setBusy(false);
  }
  async function openPack() {
    setBusy(true);
    const opened = await desktopRequest({ operation: "packs.open" }, installedPackSchema);
    if (opened.isErr()) { if (opened.error.code !== "cancelled") setStatus(opened.error.message); }
    else { setPacks((previous) => [...previous.filter((pack) => pack.id !== opened.value.id), opened.value]); setStatus("Pack integrity verified. Select a level to play."); }
    setBusy(false);
  }
  async function action(pack: InstalledPack, operation: "packs.play" | "packs.import") {
    if (busy || operation === "packs.import" && dirty) return;
    setBusy(true);
    if (operation === "packs.play") {
      const levelId = selectedLevels[pack.id] ?? pack.manifest.levels[0]?.id;
      if (levelId) {
        const result = await desktopRequest({ operation, id: pack.id, levelId }, z.void());
        if (result.isErr()) setStatus(result.error.message); else toast.success("Pack level launched");
      }
    } else {
      const imported = await desktopRequest({ operation, id: pack.id }, projectSnapshotSchema);
      if (imported.isErr()) { if (imported.error.code !== "cancelled") setStatus(imported.error.message); }
      else { document?.discard(); setExternal(null); setLevelId(imported.value.manifest.levels[0]?.id ?? null); setProject(imported.value); setDialog(null); toast.success("Editable pack project imported"); }
    }
    setBusy(false);
  }
  async function remove(pack: InstalledPack) {
    setBusy(true);
    const result = await desktopRequest({ operation: "packs.remove", id: pack.id }, z.array(installedPackSchema));
    if (result.isErr()) setStatus(result.error.message); else setPacks(result.value);
    setBusy(false);
  }
  return <Dialog open={dialog === "packs"} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
    <DialogHeader><DialogTitle>Playable packs</DialogTitle><DialogDescription>Distribute saved levels, scripts and assigned assets. Players need a compatible game installation; stock game data is supplied by that installation.</DialogDescription></DialogHeader>
    <div className="flex gap-2"><Button disabled={busy} onClick={() => void openPack()}>Open playable pack</Button><Button variant="outline" disabled={busy || !project || dirty || external !== null} onClick={() => void exportPack()}>Export current project</Button></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeEditableProject} disabled={busy} onChange={(event) => setIncludeEditableProject(event.currentTarget.checked)} />Include editable project</label>
    {includeEditableProject && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeAuthoringSources} disabled={busy} onChange={(event) => setIncludeAuthoringSources(event.currentTarget.checked)} />Include authoring sources</label>}
    <p className="text-xs text-slate-400">Runtime-only exports contain files needed to play. Editable exports retain object and asset identities. Include authoring sources to continue editing models in another project; otherwise locate their sources after import.</p>
    {dirty && <p>Save or discard current edits before exporting or importing an editable project.</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
    {packs.map((pack) => <section key={pack.id} className="grid gap-3 rounded border p-4"><h3>{pack.manifest.name} · {pack.manifest.game}</h3>
      <label className="grid gap-1 text-sm">Pack level<select className="rounded border bg-slate-900 p-2" disabled={busy} value={selectedLevels[pack.id] ?? pack.manifest.levels[0]?.id ?? ""} onChange={(event) => setSelectedLevels({ ...selectedLevels, [pack.id]: event.target.value })}>{pack.manifest.levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></label>
      <div className="flex gap-2"><Button disabled={busy} onClick={() => void action(pack, "packs.play")}>Play pack level</Button><Button variant="outline" disabled={busy || dirty || pack.manifest.editableProject === false} onClick={() => void action(pack, "packs.import")}>Import editable project</Button></div>
      {pack.manifest.editableProject === false && <p className="text-xs text-slate-400">This pack contains runtime files only.</p>}
      <Button variant="ghost" disabled={busy} onClick={() => void remove(pack)}>Remove cached pack</Button>
    </section>)}
  </DialogContent></Dialog>;
}
