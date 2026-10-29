import { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { ok, type Result } from "neverthrow";
import { z } from "zod";
import { fileSchema, projectAssetSchema, projectSnapshotSchema, relativePathSchema, type AssetImportResult, type ProjectAsset, type ProjectFile } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { desktopBridge, desktopRequest } from "./client";
import { desktopActiveDocumentAtom, desktopAssetDialogAtom, desktopConflictOpenAtom, desktopExternalProjectAtom, desktopProjectAtom, desktopProjectDirtyAtom } from "./projectState";
import { prepareAssetEdits } from "./prepareAssetEdits";
import { assetCaptureKey } from "./projectCapture";
import { err } from "neverthrow";
import { acceptProjectModelVariant, saveProjectModelVariant, type SavedModelVariant } from "./projectModelVariantSave";
import { ProjectModelPreview } from "./ProjectModelPreview";

interface Props {
  kind: "models" | "sprites";
  extension: string;
  changeToken: object | null;
  savedChangeToken?: object | null;
  onSelectionChange?: (path: string) => void;
  onClear: () => void;
  onOpen: (file: File, companions: File[], isCurrent: () => boolean) => Promise<void>;
  exportFiles: (stem: string) => Promise<Result<ProjectFile[], string>>;
}

export function ProjectAssetBinding(props: Props) {
  const store = useStore();
  const [project, setProject] = useAtom(desktopProjectAtom);
  const [dialogOpen, setDialogOpen] = useAtom(desktopAssetDialogAtom);
  const [dirty, setDirty] = useAtom(desktopProjectDirtyAtom);
  const setActiveDocument = useSetAtom(desktopActiveDocumentAtom);
  const external = useAtomValue(desktopExternalProjectAtom);
  const setConflictOpen = useSetAtom(desktopConflictOpenAtom);
  const [selected, setSelected] = useState("");
  const onSelectionChange = props.onSelectionChange;
  useEffect(() => { onSelectionChange?.(selected); }, [selected, onSelectionChange]);
  const [name, setName] = useState("custom-asset");
  const [busy, setBusy] = useState(false);
  const [assetCatalog, setAssetCatalog] = useState<{ folder: string; items: ProjectAsset[] } | null>(null);
  const [pendingState, setPendingVariant] = useState<{ folder: string; revision: string; imported: AssetImportResult; token: object | null } | null>(null);
  const [previewReady, setPreviewReady] = useState("");
  const assets = assetCatalog?.folder === project?.folder ? assetCatalog?.items ?? [] : [];
  const pendingVariant = pendingState?.folder === project?.folder && pendingState?.revision === project?.revision ? pendingState : null;
  const savedToken = useRef(props.changeToken);
  const cleanOnNextChange = useRef(false);
  const latest = useRef(props);
  const loadedRevision = useRef("");
  const requestGeneration = useRef(0);
  const mounted = useRef(false);
  const backup = useRef<() => Promise<void>>(async () => undefined);
  const save = useRef<() => Promise<void>>(async () => undefined);
  const discard = useRef<() => void>(() => undefined);
  const open = useRef<(relative: string) => Promise<void>>(async () => undefined);
  const review = useRef({ project, name, selected });
  useEffect(() => { requestGeneration.current++; mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { review.current = { project, name, selected }; }, [project, name, selected]);
  useEffect(() => { latest.current = props; }, [props]);
  useEffect(() => {
    let current = true;
    if (!project || props.kind !== "models") return;
    void desktopRequest({ operation: "assets.list" }, z.array(projectAssetSchema)).then((result) => { if (current && result.isOk()) setAssetCatalog({ folder: project.folder, items: result.value }); });
    return () => { current = false; };
  }, [project, props.kind]);
  useEffect(() => { backup.current = () => saveAsset(true); save.current = () => saveAsset(); open.current = (relative) => openAsset(relative); });
  useEffect(() => { discard.current = () => {
    savedToken.current = latest.current.changeToken;
    loadedRevision.current = "";
    setDirty(false);
    void desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
  }; }, [setDirty]);
  useEffect(() => {
    if (!desktopBridge()) return;
    setActiveDocument({ kind: props.kind, save: () => save.current(), discard: () => discard.current(),
      capture: () => assetCaptureKey(latest.current.changeToken), prepare: async () => {
        const state = review.current;
        if (!latest.current.changeToken) return err("Open an asset before building a conflict review");
        if (latest.current.kind === "models" && state.selected.startsWith("Assets/Models/")) return err("Model edits must be saved as a new asset variant after reviewing external project changes");
        return state.project ? prepareAssetEdits(state.project, latest.current.kind, state.name, state.selected, latest.current.exportFiles) : err("Open a project first");
      } });
    return () => setActiveDocument(null);
  }, [setActiveDocument, props.kind]);
  useEffect(() => {
    if (!project || !dirty) return;
    const timer = window.setInterval(() => { void backup.current(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [project, dirty]);
  useEffect(() => {
    if (!project || !desktopBridge()) return;
    if (props.savedChangeToken === props.changeToken) savedToken.current = props.changeToken;
    if (cleanOnNextChange.current) { savedToken.current = props.changeToken; cleanOnNextChange.current = false; }
    const changed = props.changeToken !== null && props.changeToken !== savedToken.current;
    setDirty(changed);
    void desktopRequest({ operation: "host.dirty", dirty: changed }, z.void());
  }, [project, props.changeToken, props.savedChangeToken, setDirty]);
  useEffect(() => {
    if (!project || !selected || dirty || busy || loadedRevision.current === project.revision) return;
    loadedRevision.current = project.revision;
    void open.current(selected);
  }, [project, selected, dirty, busy]);
  if (!desktopBridge() || !project) return null;
  const available = project.files.filter((file) => new RegExp(`\\.(?:${props.extension})$`, "i").test(file.path));

  async function openAsset(relative: string, recovered?: ProjectFile[]) {
    if (!project || busy) return;
    const generation = ++requestGeneration.current;
    const isCurrent = () => {
      const current = store.get(desktopProjectAtom);
      return mounted.current && generation === requestGeneration.current && current?.folder === project.folder
        && current.manifest.game === project.manifest.game && current.revision === project.revision;
    };
    setBusy(true);
    const directory = relative.slice(0, relative.lastIndexOf("/") + 1);
    const selectedPaths = project.files.filter((file) => file.path === relative
      || file.path.startsWith(directory) && /\.(?:skeleton\.rsrc|shapes|palette\.tga)$/.test(file.path)).map((file) => file.path);
    const result = recovered ? ok(recovered) : await desktopRequest({ operation: "project.read", paths: selectedPaths }, z.array(fileSchema));
    if (!isCurrent()) { setBusy(false); return; }
    if (!result.isOk()) { toast.error("Could not read project asset"); setBusy(false); return; }
    const files = result.value.map((file) => ({ path: file.path, file: new File([Uint8Array.from(file.bytes)], file.path.split("/").at(-1) ?? "asset") }));
    const main = files.find((file) => file.path === relative);
    if (!main) {
      latest.current.onClear();
      savedToken.current = null;
      cleanOnNextChange.current = false;
      setSelected("");
      setName("custom-asset");
      setDirty(false);
      loadedRevision.current = project.revision;
      void desktopRequest({ operation: "host.dirty", dirty: false }, z.void());
      toast.info("The asset file was deleted outside the editor. The document was closed.");
    }
    if (main) {
      cleanOnNextChange.current = !recovered;
      await props.onOpen(main.file, files.filter((file) => file !== main).map((file) => file.file), isCurrent);
      if (!isCurrent()) { cleanOnNextChange.current = false; setBusy(false); return; }
      setSelected(relative);
      setName(main.file.name.replace(/\.(?:sprite\.json|[^.]+)$/, ""));
      loadedRevision.current = project.revision;
    }
    setBusy(false);
  }

  async function saveAsset(recovery = false) {
    if (!project || busy || !latest.current.changeToken) return;
    if (!recovery && external) { setConflictOpen(true); return; }
    const directory = selected ? selected.slice(0, selected.lastIndexOf("/") + 1) : `Assets/${props.kind}/`;
    const stem = `${directory}${name.trim()}`;
    if (!relativePathSchema.safeParse(stem).success) { toast.error("Choose a safe asset name"); return; }
    setBusy(true);
    const token = latest.current.changeToken;
    if (!recovery && props.kind === "models") {
      const generation = ++requestGeneration.current;
      const result = await saveProjectModelVariant(`${name.trim()} variant`, selected, props.exportFiles);
      if (!mounted.current || generation !== requestGeneration.current || store.get(desktopProjectAtom)?.folder !== project.folder) { setBusy(false); return; }
      if (result.isErr()) toast.error(result.error);
      else if (result.value.imported.needsReview) {
        setPreviewReady("");
        setPendingVariant({ folder: project.folder, revision: project.revision, imported: result.value.imported, token });
      } else finishVariantSave(result.value, token);
      setBusy(false);
      return;
    }
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

  function finishVariantSave(result: SavedModelVariant, token: object | null) {
    savedToken.current = token;
    loadedRevision.current = result.snapshot.revision;
    setProject(result.snapshot);
    setDirty(latest.current.changeToken !== token);
    setSelected(result.imported.asset.outputs.preview);
    setPendingVariant(null);
    toast.success("Model saved as a new asset variant");
  }

  async function acceptVariant() {
    if (!pendingVariant || previewReady !== pendingVariant.imported.asset.revision || busy) return;
    const current = pendingVariant;
    setBusy(true);
    const result = await acceptProjectModelVariant(current.imported);
    if (mounted.current && store.get(desktopProjectAtom)?.folder === project?.folder) {
      if (result.isErr()) toast.error(result.error);
      else finishVariantSave(result.value, current.token);
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
      {props.kind === "sprites" ? " Save editable snapshots alongside edited native sprite and texture files. Shapes palettes are exported separately as palette TGA images; the game loads palette colors from images." : " Model edits create a new asset variant. Existing shared assets and their object assignments stay intact."}
    </DialogDescription></DialogHeader>
    <div className="grid gap-4 text-sm">
    <label className="grid gap-2">Project asset <select className="rounded border border-slate-700 bg-slate-900 p-2" value={selected} disabled={busy || dirty} onChange={(event) => void openAsset(event.target.value)}>
      <option value="">Select saved asset</option>{available.map((file) => { const asset = assets.find((entry) => entry.outputs.files.includes(file.path)); return <option key={file.path} value={file.path}>{asset ? `${asset.name} (${file.path.split(".").at(-1)?.toUpperCase()})` : file.path}</option>; })}
    </select></label>
    <label className="grid gap-2">Name <input className="rounded border border-slate-700 bg-slate-900 p-2" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <Button size="sm" disabled={busy || !props.changeToken || pendingVariant !== null} onClick={() => void saveAsset()}>{props.kind === "models" ? "Save as new model variant" : "Save asset to project"}</Button>
    {pendingVariant && <section className="grid gap-3" aria-label="Model variant conversion review"><h3>Review converted model</h3><ul className="list-disc pl-5">{pendingVariant.imported.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul><ProjectModelPreview key={pendingVariant.imported.asset.revision} asset={pendingVariant.imported.asset} onReady={setPreviewReady} /><Button disabled={busy || previewReady !== pendingVariant.imported.asset.revision} onClick={() => void acceptVariant()}>Accept conversion and save variant</Button></section>}
    {dirty && <><Button size="sm" variant="outline" disabled={busy} onClick={() => void saveAsset(true)}>Save recovery snapshot</Button>
      <Button size="sm" variant="outline" onClick={() => discard.current()}>Discard local edits</Button></>}
    {project.recoveryAvailable && <Button size="sm" variant="outline" onClick={() => void recoverAsset()}>Recover asset</Button>}
    </div>
  </DialogContent></Dialog>;
}
