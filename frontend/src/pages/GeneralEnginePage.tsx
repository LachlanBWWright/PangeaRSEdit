import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "jotai";
import { engineWorkspaceAtom, useEngineWorkspace } from "@/engine/useEngineWorkspace";
import type { EnginePackage } from "@/engine/enginePackage";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnginePackagePanel } from "@/engine/EnginePackagePanel";
import { EngineSceneInspector } from "@/engine/EngineSceneInspector";
import { EngineNativePreviewControls } from "@/engine/EngineNativePreviewControls";
import { engineFile, engineFileText, enableEngineFolderPicker, isEngineSourcePath, parseManifest, parseScene, readEngineFolder, replaceEngineScene, validateEnginePackage } from "@/engine/enginePackage";
import { engineScriptWorkspace } from "@/engine/engineLanguage";
import { downloadEnginePackage } from "@/engine/engineDownload";
import { postEnginePackage, postEngineScene } from "@/engine/engineWorkspaceState";
import { useEnginePreview } from "@/engine/useEnginePreview";
import { useEngineDocument } from "@/engine/useEngineDocument";
import { useEngineAvailability } from "@/engine/useEngineAvailability";
import "@/engine/engine.css";

const EngineCodeEditor = lazy(() => import("@/engine/EngineCodeEditor"));
const runtimeURL = `${import.meta.env.BASE_URL}generated/pangea-ports/wasm/sandbox/PangeaSandbox.html?package=foundation&embedded=1`;

export function GeneralEnginePage() {
  const [state, dispatch] = useEngineWorkspace();
  const store = useStore();
  const importRequest = useRef(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [replacement, setReplacement] = useState<EnginePackage | null>(null);
  const availability = useEngineAvailability(runtimeURL);
  const workspace = useMemo(() => engineScriptWorkspace(state.packageData), [state.packageData]);
  const onSourceChange = useCallback((content: string) => dispatch({ type: "edit", path: state.selected, content }), [state.selected, dispatch]);
  const selected = engineFile(state.packageData, state.selected);
  const text = useMemo(() => selected && isEngineSourcePath(selected.path) ? engineFileText(selected) : null, [selected]);
  const scene = useMemo(() => selected && selected.path !== "package.json" && selected.path.endsWith(".json") ? parseScene(selected) : null, [selected]);
  const manifest = useMemo(() => parseManifest(state.packageData), [state.packageData]);
  const validation = useMemo(() => validateEnginePackage(state.packageData), [state.packageData]);
  useEnginePreview(frame, dispatch, state.packageData);
  function download() {
    return downloadEnginePackage(state.packageData, dispatch);
  }
  useEngineDocument(state.dirty, download);
  return <main className="engine-workspace">
    <header className="engine-toolbar"><div><span className="engine-eyebrow">PANGEA / LUA ENGINE</span><h1>{manifest.isOk() ? manifest.value.name : "Game package"}{state.dirty ? " *" : ""}</h1></div>
      <div className="engine-toolbar-actions"><input hidden type="file" multiple ref={(element) => { input.current = element; enableEngineFolderPicker(element); }} onChange={(event) => {
        if (!event.target.files) return;
        const request = ++importRequest.current;
        void readEngineFolder(event.target.files).match((packageData) => {
          if (request !== importRequest.current) return;
          if (store.get(engineWorkspaceAtom).dirty) setReplacement(packageData);
          else dispatch({ type: "load", packageData });
        }, (message) => { if (request === importRequest.current) dispatch({ type: "status", message }); });
        event.target.value = "";
      }} /><Link className="engine-link" to="/engine/levels">Edit levels</Link><button onClick={() => input.current?.click()}>Open package folder</button><button disabled={!state.past.length} onClick={() => dispatch({ type: "undo" })}>Undo</button><button disabled={!state.future.length} onClick={() => dispatch({ type: "redo" })}>Redo</button><button onClick={download}>Download package</button>
        <EngineNativePreviewControls packageData={state.packageData} dispatch={dispatch} />
        <button className="engine-primary" disabled={!state.ready || validation.isErr()} onClick={() => postEnginePackage(state.packageData, frame, dispatch)}>Run changes</button></div>
    </header>
    <div className="engine-workbench">
      <EnginePackagePanel packageData={state.packageData} selected={state.selected} dispatch={dispatch} />
      <section className="engine-source"><header className="engine-pane-heading"><h2>{state.selected}</h2><span>{text?.isOk() ? "UTF-8 source" : "Binary asset"}</span></header>
        {scene?.isOk() && <details><summary>Scene properties</summary><EngineSceneInspector scene={scene.value} modelFiles={state.packageData.files.filter((file) => /\.(bg3d|3dmf)$/i.test(file.path)).map((file) => file.path)} onChange={(value) => {
          const next = replaceEngineScene(state.packageData, state.selected, value);
          if (next.isOk()) dispatch({ type: "replace", packageData: next.value });
          else dispatch({ type: "status", message: next.error });
        }} /></details>}
        {text?.isOk() ? <Suspense fallback={<p>Loading source editor…</p>}><EngineCodeEditor path={state.selected} content={text.value} workspace={workspace} onChange={onSourceChange} /></Suspense> : <p className="engine-muted">Binary assets are included unchanged in the package.</p>}
        {validation.isErr() && <pre className="engine-diagnostic" role="alert">{validation.error}</pre>}
      </section>
      <section className="engine-preview"><header className="engine-pane-heading"><h2>Live game</h2><span>{state.runtime ? `${state.runtime.scene} · ${state.runtime.paused ? "paused" : `${state.runtime.seconds}s`} · ${state.runtime.actors} actors` : "Starting engine…"}</span></header>
        {state.runtime && <select className="engine-scene-switcher" aria-label="Preview scene" value={state.runtime.scene} onChange={(event) => postEngineScene(event.target.value, frame)}>
          {state.runtime.scenes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>}
        {availability === "available" && <iframe ref={frame} title="Lua engine preview" src={runtimeURL} allow="gamepad" />}
        {availability === "loading" && <p className="engine-muted">Checking local runtime…</p>}
        {availability === "missing" && <div className="engine-missing"><h2>Build the Lua engine to preview</h2><p>From the repository root, build and stage the local engine runtime, then reload this workspace.</p><code>scripts/build-games.sh --game sandbox</code></div>}
        <p className="engine-muted">Click the game to play. WASD moves; Space jumps. Lua owns the menus, player and scene flow.</p>
      </section>
    </div>
    <footer className="engine-status" role="status">{state.runtime?.error || state.status}</footer>
    <Dialog open={replacement !== null} onOpenChange={(open) => { if (!open) setReplacement(null); }}><DialogContent><DialogHeader><DialogTitle>Replace the current package?</DialogTitle><DialogDescription>The current package has changes. Download them before opening another folder.</DialogDescription></DialogHeader>
      <button onClick={() => setReplacement(null)}>Keep editing</button><button onClick={() => { if (download() && replacement) { dispatch({ type: "load", packageData: replacement }); setReplacement(null); } }}>Download and open</button>
      <button onClick={() => { if (replacement) dispatch({ type: "load", packageData: replacement }); setReplacement(null); }}>Discard and open</button>
    </DialogContent></Dialog>
  </main>;
}
