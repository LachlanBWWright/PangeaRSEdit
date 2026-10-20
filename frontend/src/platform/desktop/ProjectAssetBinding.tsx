import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ok, type Result } from "neverthrow";
import { z } from "zod";
import { fileSchema, projectSnapshotSchema, relativePathSchema, type ProjectFile } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { desktopBridge, desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";

interface Props {
  kind: "models" | "sprites";
  extension: string;
  changeToken: object | null;
  onOpen: (file: File, companions: File[]) => Promise<void>;
  exportFiles: (stem: string) => Promise<Result<ProjectFile[], string>>;
}

export function ProjectAssetBinding(props: Props) {
  const [project, setProject] = useAtom(desktopProjectAtom);
  const [dialogOpen, setDialogOpen] = useAtom(desktopAssetDialogAtom);
  const [dirty, setDirty] = useAtom(desktopProjectDirtyAtom);
  const setActiveDocument = useSetAtom(desktopActiveDocumentAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const setConflictOpen = useSetAtom(desktopConflictOpenAtom);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("custom-asset");
  const [busy, setBusy] = useState(false);
  const savedToken = useRef(props.changeToken);
  const cleanOnNextChange = useRef(false);
  const latest = useRef(props);
  const loadedRevision = useRef("");
  const backup = useRef<() => Promise<void>>(async () => undefined);
  const save = useRef<() => Promise<void>>(async () => undefined);
  const discard = useRef<() => void>(() => undefined);
  const open = useRef<(relative: string) => Promise<void>>(async () => undefined);
  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => { backup.current = () => saveAsset(true); save.current = () => saveAsset(); open.current = (relative) => openAsset(relative); });
  useEffect(() => { discard.current = () => {
    savedToken.current = latest.current.changeToken;
    loadedRevision.current = "";
    setDirty(false);
    void desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
  }; }, [setDirty]);
  useEffect(() => {
    if (!desktopBridge()) return;
    setActiveDocument({ kind: props.kind, save: () => save.current(), discard: () => discard.current() });
    return () => setActiveDocument(null);
  }, [setActiveDocument, props.kind]);
  useEffect(() => {
    if (!project || !dirty) return;
    const timer = window.setInterval(() => { void backup.current(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [project, dirty]);
  useEffect(() => {
    if (!project || !desktopBridge()) return;
    if (cleanOnNextChange.current) { savedToken.current = props.changeToken; cleanOnNextChange.current = false; }
    const changed = props.changeToken !== null && props.changeToken !== savedToken.current;
    setDirty(changed);
    void desktopRequest({ operation: "host.dirty", dirty: changed }, z.void());
  }, [project, props.changeToken, setDirty]);
  useEffect(() => {
    if (!project || !selected || dirty || loadedRevision.current === project.revision) return;
    loadedRevision.current = project.revision;
    void open.current(selected);
  }, [project, selected, dirty]);
  if (!desktopBridge() || !project) return null;
  const available = project.files.filter((file) => new RegExp(`\\.(?:${props.extension})$`, "i").test(file.path));

  async function openAsset(relative: string, recovered?: ProjectFile[]) {
    if (!project || busy) return;
    setBusy(true);
    const directory = relative.slice(0, relative.lastIndexOf("/") + 1);
    const selectedPaths = project.files.filter((file) => file.path === relative
      || file.path.startsWith(directory) && /\.(?:skeleton\.rsrc|shapes)$/.test(file.path)).map((file) => file.path);
    const result = recovered ? ok(recovered) : await desktopRequest({ operation: "project.read", paths: selectedPaths }, z.array(fileSchema));
    if (!result.isOk()) { toast.error("Could not read project asset"); setBusy(false); return; }
    const files = result.value.map((file) => ({ path: file.path, file: new File([Uint8Array.from(file.bytes)], file.path.split("/").at(-1) ?? "asset") }));
    const main = files.find((file) => file.path === relative);
    if (main) {
      cleanOnNextChange.current = !recovered;
      await props.onOpen(main.file, files.filter((file) => file !== main).map((file) => file.file));
      setSelected(relative);
      setName(main.file.name.replace(/\.(?:sprite\.json|[^.]+)$/, ""));
      loadedRevision.current = project.revision;
    }
    setBusy(false);
  }

  async function saveAsset(recovery = false) {
    if (!project || busy) return;
    if (!recovery && external) { setConflictOpen(true); return; }
    const directory = selected ? selected.slice(0, selected.lastIndexOf("/") + 1) : `Assets/${props.kind}/`;
    const stem = `${directory}${name.trim()}`;
    if (!relativePathSchema.safeParse(stem).success) { toast.error("Choose a safe asset name"); return; }
    setBusy(true);
    const token = latest.current.changeToken;
    const files = await props.exportFiles(stem);
    if (files.isErr()) { toast.error(files.error); setBusy(false); return; }
    if (recovery) {
      const result = await desktopRequest({ operation: "project.backup", manifest: project.manifest, files: files.value }, z.void());
      if (result.isErr()) toast.error(result.error.message);
      else setProject((current) => current ? { ...current, recoveryAvailable: true } : current);
    } else {
      const result = await desktopRequest({ operation: "project.save", revision: project.revision, manifest: project.manifest, files: files.value, removed: [] }, projectSnapshotSchema);
      if (result.isErr()) toast.error(result.error.message);
      else {
        savedToken.current = token;
        loadedRevision.current = result.value.revision;
        setProject(result.value);
        setDirty(latest.current.changeToken !== token);
        setSelected(files.value[0]?.path ?? "");
        toast.success("Asset saved to project");
      }
    }
    setBusy(false);
  }

  async function recoverAsset() {
    const recovery = await desktopRequest({ operation: "project.recover", action: "read" }, z.array(fileSchema));
    if (recovery.isErr()) { toast.error(recovery.error.message); return; }
    const file = recovery.value.find((file) => new RegExp(`\\.(?:${props.extension})$`, "i").test(file.path));
    if (!file) { toast.info("No recovery snapshot for this asset type"); return; }
    await openAsset(file.path, recovery.value);
  }

  return <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader>
    <DialogTitle>Project {props.kind}</DialogTitle><DialogDescription>Open saved assets or save the current document into {project.manifest.name}.
      {props.kind === "sprites" && " Sprite edits and palettes are saved in .sprite.json alongside the original .shapes source."}
    </DialogDescription></DialogHeader>
    <div className="grid gap-4 text-sm">
    <label className="grid gap-2">Project asset <select className="rounded border border-slate-700 bg-slate-900 p-2" value={selected} disabled={busy || dirty} onChange={(event) => void openAsset(event.target.value)}>
      <option value="">Select saved asset</option>{available.map((file) => <option key={file.path} value={file.path}>{file.path}</option>)}
    </select></label>
    <label className="grid gap-2">Name <input className="rounded border border-slate-700 bg-slate-900 p-2" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <Button size="sm" disabled={busy || !props.changeToken} onClick={() => void saveAsset()}>Save asset to project</Button>
    {dirty && <><Button size="sm" variant="outline" disabled={busy} onClick={() => void saveAsset(true)}>Save recovery snapshot</Button>
      <Button size="sm" variant="outline" onClick={() => discard.current()}>Discard local edits</Button></>}
    {project.recoveryAvailable && <Button size="sm" variant="outline" onClick={() => void recoverAsset()}>Recover asset</Button>}
    </div>
  </DialogContent></Dialog>;
}
