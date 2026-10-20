import { Play, Download, Upload, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScriptDiagnostic } from "./scriptWorkspaceState";
import "./scriptWorkbench.css";

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
  diagnostics?: readonly ScriptDiagnostic[];
}

export function ScriptPreviewExportPanel(props: ScriptPreviewExportPanelProps) {
  const busy = props.isPreparingPreview;
  return <div className="script-workbench grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,1fr)]">
    <div className="grid content-start gap-7 min-w-0">
      <section className="workbench-section">
        <div><h2>Test it in the game</h2><p className="workbench-muted mt-1">Run this level with your Lua, or compare it with native behavior.</p></div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => props.onPreview(true)}><Play size={15} className="mr-2" />{busy ? "Preparing game…" : "Test with scripts"}</Button><Button disabled={busy} variant="secondary" onClick={() => props.onPreview(false)}>Test without scripts</Button></div>
        <div className="workbench-notice"><p className="font-medium">A generated bundle is ready to run, not a passed test.</p><p className="mt-1">LuaLS checks source when available. The game checks Lua loading, native assets and behavior. Watch its diagnostic output when testing.</p></div>
        {props.warnings.length > 0 && <div className="workbench-notice" data-tone="warning"><h3>Check before testing</h3><ul className="mt-2 list-disc space-y-1 pl-4">{props.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
        {(props.diagnostics?.length ?? 0) > 0 && <div className="grid gap-2" aria-label="Script diagnostics">{props.diagnostics?.map((entry, index) => <div key={`${entry.code}-${index}`} className="workbench-notice" data-tone="warning"><p className="font-medium">{entry.category}: {entry.code}</p><p>{entry.message}</p><p className="mt-1 break-all text-xs">{entry.filePath}{entry.line > 0 ? `, line ${entry.line}` : ""}</p></div>)}</div>}
      </section>
      <section className="grid gap-3 border-t border-slate-700 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3>Recent activity</h3><Button size="sm" variant="ghost" disabled={busy} onClick={props.onCompile}><PackageCheck size={15} className="mr-2" />Rebuild bundle</Button></div>
        <ol className="grid gap-2">{props.statusLog.length === 0 ? <li className="workbench-muted">Build or test your level to see activity here.</li> : props.statusLog.slice(-8).reverse().map((line, index) => <li key={`${index}-${line}`} className="workbench-muted border-l-2 border-slate-600 pl-3">{line}</li>)}</ol>
      </section>
    </div>
    <div className="grid content-start gap-7 min-w-0">
      <section className="grid gap-4"><div><h2>Take your work with you</h2><p className="workbench-muted mt-1">Choose what the package needs to contain.</p></div>
        <div className="grid gap-3 border-b border-slate-700 pb-5"><h3>Playable extended level</h3><p className="workbench-muted">Native level files, Lua, object definitions and assets. Requires a scripting-enabled port.</p><Button className="justify-self-start" variant="secondary" disabled={busy} onClick={props.onDownloadExtendedPackage}><Download size={15} className="mr-2" />Export extended level</Button></div>
        <div className="grid gap-3 border-b border-slate-700 pb-5"><h3>Complete scripting workspace</h3><p className="workbench-muted">Backup of source, assets and all stored levels. Import replaces this game's scripting workspace. Use shared libraries or Update Lua folder to merge IDE changes and keep level-specific work.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={props.onDownloadScriptPackage}><Download size={15} className="mr-2" />Export script package</Button><Button variant="outline" disabled={busy} onClick={props.onUploadScriptPackage}><Upload size={15} className="mr-2" />Import script package</Button></div></div>
        <div className="grid gap-3"><h3>Original-compatible level</h3><p className="workbench-muted">Native level files only. {props.hasScripts ? "Your Lua and custom objects are omitted." : "No scripting payload is included."}</p><Button className="justify-self-start" variant="ghost" disabled={busy} onClick={props.onDownloadOriginalCompatible}>Export without scripts</Button></div>
      </section>
      <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer text-sm">Script package contents</summary><ul className="mt-3 grid gap-2 text-xs text-slate-400">{["Data/Scripts/config/project.json", "Data/Scripts/config/levels.json", `Data/Scripts/config/bindings/${props.levelKey === "current" ? "current" : `level-${props.levelKey}`}.json`, "Data/Scripts/config/objects.json", "Data/Scripts/config/params.json", ...props.sourcePathOptions.filter((path) => path !== "Data/Scripts/src/main.lua"), "Data/Scripts/dist/main.lua"].map((path) => <li className="break-all" key={path}>{path}</li>)}</ul></details>
    </div>
  </div>;
}
