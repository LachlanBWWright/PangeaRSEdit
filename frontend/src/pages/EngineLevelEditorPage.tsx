import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EngineSceneCanvas } from "@/engine/EngineSceneCanvas";
import { EngineSceneInspector } from "@/engine/EngineSceneInspector";
import { EngineHeightSampleEditor } from "@/engine/EngineHeightSampleEditor";
import { EngineNativePreviewControls } from "@/engine/EngineNativePreviewControls";
import { engineFile, parseManifest, parseScene, replaceEngineScene, validateEnginePackage } from "@/engine/enginePackage";
import { useEngineWorkspace } from "@/engine/useEngineWorkspace";
import { useEnginePreview } from "@/engine/useEnginePreview";
import { useEngineDocument } from "@/engine/useEngineDocument";
import { useEngineAvailability } from "@/engine/useEngineAvailability";
import { downloadEnginePackage } from "@/engine/engineDownload";
import { postEnginePackage } from "@/engine/engineWorkspaceState";
import type { EngineTerrainTool } from "@/engine/engineTerrainEditing";
import "@/engine/engine.css";

const runtimeURL = `${import.meta.env.BASE_URL}generated/pangea-ports/wasm/sandbox/PangeaSandbox.html?package=foundation&embedded=1`;
export function EngineLevelEditorPage() {
  const [state, dispatch] = useEngineWorkspace();
  const [tool, setTool] = useState<EngineTerrainTool>("select");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [amount, setAmount] = useState(25), [radius, setRadius] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const availability = useEngineAvailability(runtimeURL);
  const manifest = useMemo(() => parseManifest(state.packageData), [state.packageData]);
  const entry = manifest.isOk() ? manifest.value.scenes.find((scene) => scene.file === state.selected) ?? manifest.value.scenes.find((scene) => scene.id === manifest.value.initialScene) : undefined;
  const file = entry ? engineFile(state.packageData, entry.file) : undefined;
  const scene = useMemo(() => file ? parseScene(file) : undefined, [file]);
  const validation = useMemo(() => validateEnginePackage(state.packageData), [state.packageData]);
  useEnginePreview(frame, dispatch, state.packageData, entry?.id);
  useEngineDocument(state.dirty, () => downloadEnginePackage(state.packageData, dispatch));
  return <main className="engine-workspace">
    <header className="engine-toolbar"><h1>Lua Engine level editor{state.dirty ? " *" : ""}</h1><div className="engine-toolbar-actions">
      <Link className="engine-link" to="/engine">Package &amp; scripts</Link>
      <button disabled={!state.past.length} onClick={() => dispatch({ type: "undo" })}>Undo</button><button disabled={!state.future.length} onClick={() => dispatch({ type: "redo" })}>Redo</button>
      <button onClick={() => downloadEnginePackage(state.packageData, dispatch)}>Download package</button>
      <EngineNativePreviewControls packageData={state.packageData} dispatch={dispatch} sceneId={entry?.id} />
      <button className="engine-primary" disabled={!state.ready || validation.isErr()} onClick={() => postEnginePackage(state.packageData, frame, dispatch)}>Preview level</button>
    </div></header>
    {manifest.isOk() && entry && <div className="engine-level-tools"><label>Scene<select value={entry.file} onChange={(event) => dispatch({ type: "select", path: event.target.value })}>{manifest.value.scenes.map((sceneEntry) => <option key={sceneEntry.id} value={sceneEntry.file}>{sceneEntry.name}</option>)}</select></label>
      <fieldset><legend>Terrain tool</legend>{(["select", "raise", "lower", "flatten"] satisfies EngineTerrainTool[]).map((value) => <button key={value} aria-pressed={tool === value} onClick={() => setTool(value)}>{value === "select" ? "Move boxes" : value[0]?.toUpperCase() + value.slice(1)}</button>)}</fieldset>
      <label>{tool === "flatten" ? "Target height" : "Height step"}<input type="number" value={amount} onChange={(event) => { if (Number.isFinite(event.target.valueAsNumber)) setAmount(event.target.valueAsNumber); }} /></label>
      <label>Radius in samples<input type="number" min={0} max={64} value={radius} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isInteger(value) && value >= 0 && value <= 64) setRadius(value); }} /></label>
    </div>}
    {scene?.isOk() && entry ? <div className="engine-level-layout"><section className="engine-level-map"><h2>Top view · X / Z</h2><p className="engine-muted">Click to edit height samples. Drag collision boxes to move them. Undo restores the previous edit.</p>
      <EngineSceneCanvas scene={scene.value} tool={tool} amount={amount} radius={radius} selectedEntityId={selectedEntityId} onSelectEntity={setSelectedEntityId} onChange={(value) => {
        const next = replaceEngineScene(state.packageData, entry.file, value);
        if (next.isOk()) dispatch({ type: "replace", packageData: next.value, selected: entry.file });
        else dispatch({ type: "status", message: next.error });
      }} />
      <EngineHeightSampleEditor scene={scene.value} onChange={(value) => {
        const next = replaceEngineScene(state.packageData, entry.file, value);
        if (next.isOk()) dispatch({ type: "replace", packageData: next.value, selected: entry.file });
      }} />
      <EngineSceneInspector scene={scene.value} selectedEntityId={selectedEntityId} onSelectEntity={setSelectedEntityId} modelFiles={state.packageData.files.filter((asset) => /\.(bg3d|3dmf)$/i.test(asset.path)).map((asset) => asset.path)} onChange={(value) => {
        const next = replaceEngineScene(state.packageData, entry.file, value);
        if (next.isOk()) dispatch({ type: "replace", packageData: next.value, selected: entry.file });
        else dispatch({ type: "status", message: next.error });
      }} /></section><section className="engine-preview"><header className="engine-pane-heading"><h2>Game preview</h2><span>{state.runtime?.scene ?? "Starting…"}</span></header>
      {availability === "available" && <iframe ref={frame} title="Lua engine preview" src={runtimeURL} allow="gamepad" />}
      {availability === "missing" && <p className="engine-muted">Build the preview with scripts/build-games.sh --game sandbox, then reload.</p>}
      {availability === "loading" && <p className="engine-muted">Checking local runtime…</p>}
    </section></div> : <p className="engine-diagnostic" role="alert">{scene?.isErr() ? scene.error : "Select a valid scene in Package & scripts to edit its terrain."}</p>}
    <footer className="engine-status" role="status">{state.runtime?.error || state.status}</footer>
  </main>;
}
