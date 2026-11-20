import { useState, type Dispatch } from "react";
import { addEngineScene, updateEngineManifest, type EngineWorkspaceAction } from "./engineWorkspaceState";
import { parseManifest, type EnginePackage } from "./enginePackage";
import { EngineFileTools } from "./EngineFileTools";

interface Props { packageData: EnginePackage; selected: string; dispatch: Dispatch<EngineWorkspaceAction> }
export function EnginePackagePanel({ packageData, selected, dispatch }: Props) {
  const manifest = parseManifest(packageData);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  return <aside className="engine-package-panel" aria-label="Package files">
    <h2>Package</h2>
    {manifest.isOk() && <><label>Game name<input value={manifest.value.name} maxLength={127} onChange={(event) => { if (event.target.value.trim()) dispatch({ type: "replace", packageData: updateEngineManifest(packageData, { ...manifest.value, name: event.target.value }) }); }} /></label>
      <label>Start scene<select value={manifest.value.initialScene} onChange={(event) => dispatch({ type: "replace", packageData: updateEngineManifest(packageData, { ...manifest.value, initialScene: event.target.value }) })}>
        {manifest.value.scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
      </select></label></>}
    <h2>Source files</h2><div className="engine-file-list">{packageData.files.map((file) => <button key={file.path} aria-current={file.path === selected ? "true" : undefined} onClick={() => dispatch({ type: "select", path: file.path })} title={file.path}>{file.path}</button>)}</div>
    <EngineFileTools packageData={packageData} selected={selected} dispatch={dispatch} />
    <form onSubmit={(event) => {
      event.preventDefault();
      const added = addEngineScene(packageData, id, name);
      if (added.isErr()) dispatch({ type: "status", message: added.error });
      else { dispatch({ type: "replace", packageData: added.value, selected: `scenes/${id}.lua` }); setId(""); setName(""); }
    }}>
      <h2>New scene</h2><label>Scene ID<input required pattern="[A-Za-z0-9_-]+" value={id} onChange={(event) => setId(event.target.value)} placeholder="courtyard" /></label>
      <label>Display name<input required maxLength={127} value={name} onChange={(event) => setName(event.target.value)} placeholder="Courtyard" /></label>
      <button type="submit">Create scene + controller</button>
    </form>
  </aside>;
}
