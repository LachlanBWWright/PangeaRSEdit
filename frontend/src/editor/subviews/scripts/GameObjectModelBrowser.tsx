import { useEffect, useMemo, useState } from "react";
import type { Result } from "neverthrow";
import type { Game } from "@/data/globals/globals";
import type { GameModel } from "@/components/GameModelSelector";
import { Button } from "@/components/ui/button";
import { useAssetState } from "@/assets/useAssetState";
import { gameModelCatalog, catalogNativeDefinition, selectedCatalogModel, catalogObjectLabel } from "./scriptGameModelCatalog";
import { loadCatalogModel, prepareCatalogImport, type LoadedCatalogModel } from "./scriptCatalogImport";
import { CatalogModelChoices } from "./CatalogModelChoices";
import { UploadedObjectModelPreview } from "./UploadedObjectModelPreview";
import { objectAppearanceName } from "./scriptObjectPreview";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

function CatalogSelection({ game, model, workspace, definition, metadata, onChange, update, onApplied }: {
  game: Game; model: GameModel; workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition;
  metadata?: Readonly<Record<string, string>>; onChange: (definition: ScriptCustomObjectDefinition) => void;
  update: (change: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void;
  onApplied?: () => void;
}) {
  const { revision } = useAssetState();
  const [loaded, setLoaded] = useState<{ revision: number; result: Result<LoadedCatalogModel, string> } | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = selectedCatalogModel(game, workspace.context.levelNumber, definition, metadata);
  const [index, setIndex] = useState(initial === model && (definition.visual.kind === "nativeDisplayGroup" || definition.visual.kind === "customDisplayGroup") ? definition.visual.modelObject : 0);
  useEffect(() => {
    let active = true;
    void loadCatalogModel(game, model).then((result) => { if (active) setLoaded({ revision, result }); });
    return () => { active = false; };
  }, [game, model, revision, retry]);
  const result = loaded?.revision === revision ? loaded.result : null;
  const data = result?.isOk() ? result.value : null;
  const assets = data?.assets;
  const previewAssets = useMemo<ScriptWorkspaceState["assets"]>(() => Object.fromEntries((assets ?? []).map((asset) => [asset.path, asset])), [assets]);
  const native = catalogNativeDefinition(game, workspace.context.levelNumber, model, index, definition, metadata);
  async function copyToPackage() {
    if (!assets) return;
    setBusy(true); setError(null);
    const prepared = await prepareCatalogImport(workspace, definition, model, assets, index);
    if (prepared.isErr()) setError(prepared.error); else { update(prepared.value); onApplied?.(); }
    setBusy(false);
  }
  if (!result) return <p role="status">Loading {model.name}…</p>;
  if (result.isErr()) return <div role="alert"><p>Could not load {model.name}: {result.error}</p><Button variant="outline" onClick={() => setRetry(retry + 1)}>Retry loading models</Button></div>;
  const count = data?.count ?? 0;
  if (!count) return <p role="status">This file has no selectable objects.</p>;
  const modelAsset = assets?.[0];
  const skeletonAsset = assets?.[1];
  const preview: ScriptCustomObjectDefinition = { ...definition, visual: skeletonAsset
    ? { kind: "customSkeleton", modelPath: modelAsset?.path ?? "", skeletonPath: skeletonAsset.path.replace(/\.rsrc$/i, ""), animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1, scale: definition.visual.kind === "none" ? 1 : definition.visual.scale, slot: 450 }
    : { kind: "customDisplayGroup", modelPath: modelAsset?.path ?? "", modelObject: index, scale: definition.visual.kind === "none" ? 1 : definition.visual.scale, slot: 450 } };
  const applied = initial === model && (definition.visual.kind === "nativeSkeleton" || definition.visual.kind === "nativeDisplayGroup" && definition.visual.modelObject === index);
  const label = catalogObjectLabel(game, model, index);
  return <div className="model-candidate-layout">
    <div className="grid content-start gap-3">
    {model.skeletonFile ? <p className="workbench-muted">Animated skeleton</p> : <CatalogModelChoices game={game} model={model} count={count} selected={index} assets={previewAssets} onSelect={setIndex} />}
    <p className="workbench-muted">{workspace.context.levelNumber === null
      ? "Choose a target level to check native availability, or copy this model into your package."
      : native ? "Available in this level."
      : "Not loaded in this level. Include its assets to use it here."}</p>
    {applied && <p className="workbench-muted">Currently applied to this object.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={!native || busy || applied} onClick={() => { if (native) onChange(native); }}>{applied ? "Currently applied" : `Use ${label}`}</Button>
      <Button variant="outline" disabled={busy} onClick={() => void copyToPackage()}>{busy ? "Including assets…" : "Include assets and use"}</Button></div>
    <p className="workbench-muted">Including assets copies the model and animations into exported objects.</p>
    {error && <p role="alert">{error}</p>}
    </div><UploadedObjectModelPreview definition={preview} workspace={{ ...workspace, assets: previewAssets }} showCollision={false} candidate />
  </div>;
}

export function GameObjectModelBrowser({ game, workspace, definition, metadata, onChange, update, onApplied }: {
  game: Game; workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition;
  metadata?: Readonly<Record<string, string>>; onChange: (definition: ScriptCustomObjectDefinition) => void;
  update: (change: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void;
  onApplied?: () => void;
}) {
  const catalog = gameModelCatalog(game);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const selected = catalog.find((model) => model.bg3dFile === selection)
    ?? selectedCatalogModel(game, workspace.context.levelNumber, definition, metadata) ?? catalog[0];
  const filtered = catalog.filter((model) => `${model.name} ${model.category}`.toLowerCase().includes(search.toLowerCase()));
  if (!catalog.length) return null;
  return <section className="workbench-section" aria-label="Game model library">
    <p>Current: <strong>{objectAppearanceName(game, workspace, definition, metadata)}</strong></p>
    <label className="workbench-field">Find a model<input className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search characters, levels and objects" /></label>
    <label className="workbench-field">Model file<select className="h-9 w-full min-w-0 rounded-md border border-slate-600 bg-slate-900 px-3" value={selected?.bg3dFile ?? ""} onChange={(event) => setSelection(event.target.value)}>
      {selected && !filtered.includes(selected) && <option value={selected.bg3dFile}>{selected.name} (selected)</option>}
      {["Characters", "Levels", "Objects"].map((category) => <optgroup key={category} label={category}>{filtered.filter((model) => model.category === category).map((model) => <option key={model.bg3dFile + model.skeletonFile} value={model.bg3dFile}>{model.name}</option>)}</optgroup>)}
    </select></label>
    {!filtered.length && <p role="status">No models match this search.</p>}
    {selected && <CatalogSelection key={`${game}:${selected.bg3dFile}:${selected.skeletonFile}`} game={game} model={selected} workspace={workspace} definition={definition} metadata={metadata} onChange={onChange} update={update} onApplied={onApplied} />}
  </section>;
}
