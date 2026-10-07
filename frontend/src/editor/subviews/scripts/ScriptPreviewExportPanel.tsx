import { Button } from "@/components/ui/button";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getScriptBuildStatus } from "./scriptBuildStatus";

interface ScriptPreviewExportPanelProps {
  isPreparingPreview: boolean;
  onPreview: (withScripts: boolean) => void;
  onCompile: () => void;
  onDownloadExtendedPackage: () => void;
  onDownloadOriginalCompatible: () => void;
  onDownloadScriptPackage: () => void;
  onUploadScriptPackage: () => void;
  statusLog: readonly string[];
  levelKey: string;
  sourcePathOptions: readonly string[];
  warnings: readonly string[];
  hasScripts: boolean;
  workspace?: ScriptWorkspaceState;
}

export function ScriptPreviewExportPanel({
  isPreparingPreview, onPreview, onCompile, onDownloadExtendedPackage,
  onDownloadOriginalCompatible, onDownloadScriptPackage, onUploadScriptPackage,
  statusLog, levelKey, sourcePathOptions, warnings, hasScripts, workspace,
}: ScriptPreviewExportPanelProps) {
  const packagePaths = workspace ? [
    ...Object.keys(workspace.sourceFiles), ...Object.keys(workspace.assets), ...Object.keys(workspace.compiledFiles),
  ] : [
    "Data/Scripts/config/project.json", "Data/Scripts/config/levels.json",
    `Data/Scripts/config/bindings/level-${levelKey}.json`,
    `Data/Scripts/config/placements/level-${levelKey}.json`,
    "Data/Scripts/config/objects.json", "Data/Scripts/config/params.json",
    ...sourcePathOptions.filter((path) => path !== "Data/Scripts/src/main.lua"),
    "Data/Scripts/dist/main.lua",
  ];

  return (
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-6">
        <section className="grid gap-3">
          <h3 className="font-semibold text-white">Preview</h3>
          <p className="text-sm text-slate-400">Run the selected level when ready.</p>
          {workspace && <p role="status" className="text-xs text-slate-400">{getScriptBuildStatus(workspace).message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onPreview(hasScripts)} disabled={isPreparingPreview}>
              {isPreparingPreview ? "Preparing Preview..." : hasScripts ? "Preview with Scripts" : "Preview in Game"}
            </Button>
            {hasScripts && <Button onClick={() => onPreview(false)} disabled={isPreparingPreview} variant="ghost">Preview in Game (No Scripts)</Button>}
            <Button variant="outline" onClick={onCompile}>Validate scripts</Button>
          </div>
        </section>

        {warnings.length > 0 && <section className="border-l-2 border-amber-500 pl-4" aria-label="Scripting capability warnings">
          <h4 className="text-sm font-medium text-amber-300">Runtime compatibility</h4>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-200">
            {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          </ul>
        </section>}

        <section className="grid gap-3 border-t border-slate-800 pt-5">
          <h3 className="font-semibold text-white">Export your level</h3>
          <p className="text-sm text-slate-400">Playable exports include the level, scripts and custom-item assets for the custom Pangea ports.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onDownloadExtendedPackage}>Export playable level</Button>
            <Button variant="outline" onClick={onDownloadOriginalCompatible}>Download Original-Compatible Level</Button>
          </div>
          <p className="text-xs text-slate-500">Original-compatible exports omit scripts and custom items.</p>
        </section>

        <section className="grid gap-3 border-t border-slate-800 pt-5">
          <h3 className="font-semibold text-white">Script project</h3>
          <p className="text-sm text-slate-400">Back up the Lua project and assets, or transfer them to another editor. Native level files are exported separately.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onDownloadScriptPackage}>Download Script Package</Button>
            <Button variant="outline" onClick={onUploadScriptPackage}>Upload Script Package</Button>
          </div>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer text-slate-300">Edit with VS Code or another IDE</summary>
            <p className="mt-2">Download the package, edit files under <code>Data/Scripts/src/</code>, then upload the complete ZIP, compile and preview. LuaLS settings, generated declarations and a starter example are included.</p>
          </details>
        </section>
      </div>

      <div className="grid min-w-0 content-start gap-6 xl:border-l xl:border-slate-800 xl:pl-6">
        <section className="min-w-0">
          <h3 className="font-semibold text-white">Package contents</h3>
          <p className="mt-1 text-xs text-slate-400">Current source, attached assets and generated output. Export also includes level configuration.</p>
          <ul className="mt-3 divide-y divide-slate-800 border-y border-slate-800">
            {packagePaths.map((path) => <li key={path} className="flex min-w-0 items-baseline justify-between gap-3 py-2 text-xs text-slate-300">
              <code className="min-w-0 break-all">{path}</code>
              {workspace?.assets[path] && <span className="shrink-0 text-slate-500">{Math.ceil((workspace.assets[path]?.bytes.byteLength ?? 0) / 1024)} KiB</span>}
            </li>)}
          </ul>
        </section>
        <details className="border-t border-slate-800 pt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-300">Status log</summary>
          {statusLog.length === 0 ? <p className="mt-3 text-xs text-slate-400">No recent log entries.</p> : <ol className="mt-3 divide-y divide-slate-800">
            {statusLog.map((line, index) => <li key={`${line}-${String(index)}`} className="break-words py-2 text-xs text-slate-400">{line}</li>)}
          </ol>}
        </details>
      </div>
    </div>
  );
}
