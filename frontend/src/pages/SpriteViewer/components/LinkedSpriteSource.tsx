import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { z } from "zod";
import { projectSnapshotSchema, spriteAssetSchema, spriteReadSchema, type SpriteAsset, type SpriteRead } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";
import { desktopBridge, desktopRequest } from "@/platform/desktop/client";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";
import { spriteProjectFiles } from "@/platform/desktop/spriteProjectFiles";
import type { SpriteData } from "../types";
import type { Palette } from "../utils/paletteUtils";
import type { SpriteSheetPreview } from "../utils/spriteSheetImport";
import { previewLinkedSprite, replaceLinkedSprite } from "../utils/linkedSpriteImport";
import { EditorPanel } from "./EditorPanel";
import { SpriteNativePreview } from "./SpriteNativePreview";

interface Props {
  readonly data: SpriteData;
  readonly palette: Palette;
  readonly selectedShapeIndex: number;
  readonly nativePath: string;
  readonly onSaved: (expected: SpriteData, replacement: SpriteData) => void;
}
interface Pending {
  readonly source: SpriteRead;
  readonly preview: SpriteSheetPreview;
  readonly data: SpriteData;
  readonly palette: Palette;
  readonly revision: string;
  readonly folder: string;
}

export function LinkedSpriteSource(props: Props) {
  const project = useAtomValue(desktopProjectAtom);
  const dirty = useAtomValue(desktopProjectDirtyAtom);
  const setProject = useSetAtom(desktopProjectAtom);
  const store = useStore();
  const [assets, setAssets] = useState<SpriteAsset[]>([]);
  const [mode, setMode] = useState<"managed" | "external">("managed");
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = useRef(props);
  latest.current = props;
  const generation = useRef(0);
  const ignoredSource = useRef<{ id: string; fingerprint: string } | null>(null);
  const nativePath = project?.files.some((file) => file.path === props.nativePath && /\.shapes$/i.test(file.path)) ? props.nativePath : "";
  const linked = assets.find((asset) => asset.nativePath === nativePath && asset.shapeIndex === props.selectedShapeIndex);
  const current = pending?.folder === project?.folder && pending?.data === props.data && pending.palette === props.palette && pending.source.asset.id === linked?.id ? pending : null;
  const folder = project?.folder;
  const revision = project?.revision;
  const watchImport = useEffectEvent((source: SpriteRead) => convert(source, true));

  useEffect(() => {
    let active = true;
    if (folder && desktopBridge()) void desktopRequest({ operation: "sprites.list" }, z.array(spriteAssetSchema)).then((result) => {
      if (active && result.isOk()) setAssets(result.value);
    });
    return () => { active = false; };
  }, [folder, revision]);
  useEffect(() => () => { generation.current++; }, [props.data, props.palette, props.selectedShapeIndex, props.nativePath, project?.folder]);

  useEffect(() => {
    if (!linked || !folder || dirty || busy || pending) return;
    let active = true;
    const timer = window.setInterval(() => {
      void desktopRequest({ operation: "sprites.read", id: linked.id }, spriteReadSchema).then(async (result) => {
        if (!active) return;
        if (result.isErr()) { setError(result.error.message); return; }
        const ignored = ignoredSource.current;
        if (result.value.fingerprint !== linked.source.fingerprint
          && !(ignored?.id === linked.id && ignored.fingerprint === result.value.fingerprint)) await watchImport(result.value);
      });
    }, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [linked, folder, dirty, busy, pending]);

  if (!desktopBridge() || !project) return null;

  async function convert(source: SpriteRead, automatic: boolean) {
    const captured = latest.current;
    const projectAtStart = store.get(desktopProjectAtom);
    const folder = projectAtStart?.folder;
    const token = ++generation.current;
    setBusy(true); setError("");
    const preview = await previewLinkedSprite(source, captured.data, captured.palette);
    if (generation.current !== token || store.get(desktopProjectAtom)?.folder !== folder || latest.current.data !== captured.data || latest.current.palette !== captured.palette) { setBusy(false); return; }
    setBusy(false);
    if (preview.isErr()) { setError(preview.error); return; }
    if (!projectAtStart) return;
    const next = { source, preview: preview.value, data: captured.data, palette: captured.palette, revision: projectAtStart.revision, folder: projectAtStart.folder };
    if (automatic && !preview.value.changedColors && !preview.value.partialAlpha && !store.get(desktopProjectDirtyAtom)) await apply(next);
    else setPending(next);
  }

  async function apply(value: Pending) {
    if (latest.current.data !== value.data || latest.current.palette !== value.palette || store.get(desktopProjectAtom)?.folder !== value.folder) return;
    const folder = value.folder;
    const replacement = replaceLinkedSprite(value.data, value.source.asset.shapeIndex, value.preview);
    const files = spriteProjectFiles(value.source.asset.nativePath.replace(/\.shapes$/i, ""), replacement, value.palette);
    if (files.isErr()) { setError(files.error); return; }
    setBusy(true);
    const result = await desktopRequest({ operation: "sprites.commit", id: value.source.asset.id, fingerprint: value.source.fingerprint,
      revision: value.revision, files: files.value, frames: value.preview.frames.map((frame) => ({ name: frame.name, durationMs: frame.durationMs ?? 100 })) }, projectSnapshotSchema);
    setBusy(false);
    if (store.get(desktopProjectAtom)?.folder !== folder) return;
    if (result.isErr()) { setError(result.error.message); return; }
    setProject(result.value);
    props.onSaved(value.data, replacement);
    setAssets((currentAssets) => currentAssets.map((asset) => asset.id === value.source.asset.id
      ? { ...asset, source: { ...asset.source, fingerprint: value.source.fingerprint } } : asset));
    setPending(null);
  }

  async function linkSource(storage: "managed" | "external") {
    const projectAtStart = store.get(desktopProjectAtom);
    if (!projectAtStart) return;
    setBusy(true); setError(""); setPending(null);
    const result = await desktopRequest({ operation: "sprites.link", nativePath, shapeIndex: props.selectedShapeIndex,
      name: `${props.data.filename} shape ${props.selectedShapeIndex + 1}`, mode: storage }, spriteAssetSchema);
    setBusy(false);
    if (store.get(desktopProjectAtom)?.folder !== projectAtStart.folder) return;
    if (result.isErr()) { setError(result.error.message); return; }
    const snapshot = await desktopRequest({ operation: "project.inspect" }, projectSnapshotSchema);
    if (snapshot.isErr()) { setError(snapshot.error.message); return; }
    if (store.get(desktopProjectAtom)?.folder !== projectAtStart.folder) return;
    setProject(snapshot.value);
    setAssets((currentAssets) => [...currentAssets.filter((asset) => asset.id !== result.value.id), result.value]);
    const read = await desktopRequest({ operation: "sprites.read", id: result.value.id }, spriteReadSchema);
    if (store.get(desktopProjectAtom)?.folder !== projectAtStart.folder) return;
    if (read.isErr()) setError(read.error.message); else await convert(read.value, false);
  }

  async function previewSource(id: string) {
    const folderAtStart = store.get(desktopProjectAtom)?.folder;
    const dataAtStart = latest.current.data;
    const token = generation.current;
    const result = await desktopRequest({ operation: "sprites.read", id }, spriteReadSchema);
    if (generation.current !== token || store.get(desktopProjectAtom)?.folder !== folderAtStart || latest.current.data !== dataAtStart) return;
    if (result.isErr()) setError(result.error.message); else await convert(result.value, false);
  }

  return <EditorPanel title="Linked sprite source">
    <p className="text-xs text-gray-400">Keep the selected shape linked to a PNG or Aseprite PNG/JSON export. Compatible changes reimport automatically while this document has no unsaved edits.</p>
    <p className="break-all text-xs">{nativePath || "Save or open this sprite in the project before linking its source."}</p>
    {linked ? <>
      <p className="text-xs">{linked.name} · Shape {linked.shapeIndex + 1} · {linked.source.mode === "managed" ? "Sources stored in project" : "External source"}{linked.source.authoringPath ? " · Aseprite document and exports" : ""}</p>
      <details className="text-xs"><summary>Export destinations</summary><p className="mt-2">Export from your sprite editor to these linked files. Managed paths are relative to the project folder.</p><p className="break-all">PNG: {linked.source.imagePath}</p>{linked.source.metadataPath && <p className="break-all">JSON: {linked.source.metadataPath}</p>}</details>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void previewSource(linked.id)}>Preview reimport</Button>
        <Button size="sm" variant="outline" disabled={busy || dirty} onClick={() => void linkSource(linked.source.mode)}>Relink source</Button>
        {(["open", "reveal"] satisfies readonly ("open" | "reveal")[]).map((action) => <Button key={action} size="sm" variant="outline" onClick={async () => { const result = await desktopRequest({ operation: "sprites.external", id: linked.id, action }, z.unknown()); if (result.isErr()) setError(result.error.message); }}>{action === "open" ? "Open source" : "Reveal source"}</Button>)}</div>
    </> : <>
      <label className="block text-xs">Source storage<select className="ml-2 bg-gray-800" value={mode} onChange={(event) => { const parsed = z.enum(["managed", "external"]).safeParse(event.currentTarget.value); if (parsed.success) setMode(parsed.data); }}><option value="managed">Copy into project</option><option value="external">Link external files</option></select></label>
      <Button size="sm" variant="outline" disabled={!nativePath || busy || dirty} onClick={() => void linkSource(mode)}>Link PNG / Aseprite export</Button>
    </>}
    <Button size="sm" variant="ghost" onClick={async () => { const result = await desktopRequest({ operation: "sprites.configure-editor" }, z.unknown()); if (result.isErr()) setError(result.error.message); }}>Configure sprite editor</Button>
    {current && <div className="space-y-2 text-xs"><SpriteNativePreview preview={current.preview} palette={props.palette} /><p>{current.preview.frames.length} frames. {current.preview.changedColors} pixels mapped to the palette; {current.preview.partialAlpha} partial-alpha pixels converted to a binary mask.</p><p>Origins, flags and native animation commands stay unchanged. Source frame names and durations are retained with the linked source.</p><Button size="sm" disabled={busy || dirty} onClick={() => void apply(current)}>Accept conversion and save sprite</Button><Button size="sm" variant="ghost" onClick={() => { ignoredSource.current = { id: current.source.asset.id, fingerprint: current.source.fingerprint }; setPending(null); }}>Keep current sprite</Button></div>}
    {dirty && <p className="text-xs text-amber-300">Save or discard your sprite edits before linking or applying a source update.</p>}
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
  </EditorPanel>;
}
