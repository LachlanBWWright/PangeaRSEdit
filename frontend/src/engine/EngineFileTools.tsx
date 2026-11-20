import { useRef, useState, type Dispatch } from "react";
import { useStore } from "jotai";
import { addEngineFiles, createEngineSource, readEngineAssets, removeEngineFile, renameEngineFile } from "./engineFiles";
import { engineWorkspaceAtom } from "./useEngineWorkspace";
import type { EnginePackage } from "./enginePackage";
import type { EngineWorkspaceAction } from "./engineWorkspaceState";

interface Props { packageData: EnginePackage; selected: string; dispatch: Dispatch<EngineWorkspaceAction> }
export function EngineFileTools({ packageData, selected, dispatch }: Props) {
  const [sourcePath, setSourcePath] = useState("");
  const [renamePath, setRenamePath] = useState("");
  const [directory, setDirectory] = useState("assets");
  const [removing, setRemoving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const store = useStore();
  return <details className="engine-file-tools"><summary>Manage files &amp; assets</summary>
    <form onSubmit={(event) => {
      event.preventDefault();
      createEngineSource(packageData, sourcePath).match((next) => { dispatch({ type: "replace", packageData: next, selected: sourcePath }); setSourcePath(""); }, (message) => dispatch({ type: "status", message }));
    }}><label>New source path<input required value={sourcePath} placeholder="scripts/encounters.lua" onChange={(event) => setSourcePath(event.target.value)} /></label><button>Create source file</button></form>
    <label>Import into folder<input value={directory} placeholder="assets" onChange={(event) => setDirectory(event.target.value)} /></label>
    <input hidden multiple type="file" ref={input} onChange={(event) => {
      if (!event.target.files) return;
      const files = Array.from(event.target.files);
      void readEngineAssets(files, directory).match((loaded) => {
        const current = store.get(engineWorkspaceAtom).packageData;
        if (current !== packageData) { dispatch({ type: "status", message: "The package changed while files were being read. Import them again to keep those edits." }); return; }
        addEngineFiles(current, loaded).match((next) => dispatch({ type: "replace", packageData: next, selected: loaded[0]?.path }), (message) => dispatch({ type: "status", message }));
      }, (message) => dispatch({ type: "status", message }));
      event.target.value = "";
    }} />
    <button type="button" onClick={() => input.current?.click()}>Import model, image or resource files</button>
    <p className="engine-muted">Files stay inside the package. Imported models become available in Scene properties.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      renameEngineFile(packageData, selected, renamePath).match((next) => { dispatch({ type: "replace", packageData: next, selected: renamePath }); setRenamePath(""); }, (message) => dispatch({ type: "status", message }));
    }}><label>Rename selected file<input required value={renamePath} placeholder={selected} onChange={(event) => setRenamePath(event.target.value)} /></label><button>Rename file</button></form>
    <p className="engine-muted">Model references in scenes follow renames. Update any paths or require calls written in Lua yourself.</p>
    {!removing ? <button onClick={() => setRemoving(true)}>Remove selected file…</button> : <div className="engine-file-removal"><p>Remove {selected}? Undo restores the file. Check Lua imports and asset paths first.</p><button onClick={() => setRemoving(false)}>Keep file</button><button onClick={() => {
      removeEngineFile(packageData, selected).match((next) => { dispatch({ type: "replace", packageData: next, selected: "package.json" }); setRemoving(false); }, (message) => dispatch({ type: "status", message }));
    }}>Remove file</button></div>}
  </details>;
}
