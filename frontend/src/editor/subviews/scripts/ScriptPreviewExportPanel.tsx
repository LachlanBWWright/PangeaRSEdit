import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
}

export function ScriptPreviewExportPanel({
  isPreparingPreview,
  onPreview,
  onCompile,
  onDownloadExtendedPackage,
  onDownloadOriginalCompatible,
  onDownloadScriptPackage,
  onUploadScriptPackage,
  statusLog,
  levelKey,
  sourcePathOptions,
  warnings,
  hasScripts,
}: ScriptPreviewExportPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <div className="grid gap-4">
        <Card className="border-sky-900 bg-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sky-200">
              Prefer VS Code or another IDE?
            </CardTitle>
            <CardDescription className="text-xs text-sky-300/80">
              Download the script package, edit the Lua source in your IDE, then upload the complete ZIP here.
              It includes LuaLS settings, generated declarations, and a starter example.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-xs text-sky-100/80">
            <p>1. Download Script Package</p>
            <p>2. Edit files under Data/Scripts/src/</p>
            <p>3. Upload Script Package, compile, and preview</p>
          </CardContent>
        </Card>
        {warnings.length > 0 && (
          <Card className="border-amber-900 bg-amber-950/20 text-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-300">
                Scripting Capability Warnings
              </CardTitle>
              <CardDescription className="text-xs text-amber-400/80">
                The current scripts use APIs or hooks that may be unsupported or stubbed in the selected game runtime.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              {warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{warning}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Preview and Export</CardTitle>
            <CardDescription>
              Preview injects the generated bundle and sidecars into the
              existing browser runtime path. Original-compatible exports omit
              scripts conservatively; extended packages include both the native
              level files and Data/Scripts payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {hasScripts ? (
              <>
                <Button
                  onClick={() => onPreview(false)}
                  disabled={isPreparingPreview}
                  variant="secondary"
                >
                  Preview in Game (No Scripts)
                </Button>
                <Button
                  onClick={() => onPreview(true)}
                  disabled={isPreparingPreview}
                >
                  {isPreparingPreview ? "Preparing Preview..." : "Preview with Scripts"}
                </Button>
              </>
            ) : (
              <Button onClick={() => onPreview(false)} disabled={isPreparingPreview}>
                {isPreparingPreview ? "Preparing Preview..." : "Preview in Game"}
              </Button>
            )}
            <Button variant="outline" onClick={onCompile}>
              Compile Bundle
            </Button>
            <Button variant="outline" onClick={onDownloadExtendedPackage}>
              Download Extended Package
            </Button>
            <Button variant="outline" onClick={onDownloadOriginalCompatible}>
              Download Original-Compatible Level
            </Button>
            <Button variant="outline" onClick={onDownloadScriptPackage}>
              Download Script Package
            </Button>
            <Button variant="outline" onClick={onUploadScriptPackage}>
              Upload Script Package
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Status Log</CardTitle>
            <CardDescription>
              Recent workspace operations and compile state.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {statusLog.length === 0 ? (
              <p className="text-xs text-slate-400">No recent log entries.</p>
            ) : (
              statusLog.map((line, index) => (
                <div
                  key={`${line}-${String(index)}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200"
                >
                  {line}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Package Contents</CardTitle>
          <CardDescription>
            These are the editor-owned files that the Scripts workspace writes
            into Data/Scripts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {[
            "Data/Scripts/config/project.json",
            "Data/Scripts/config/levels.json",
            `Data/Scripts/config/bindings/level-${levelKey}.json`,
            `Data/Scripts/config/placements/level-${levelKey}.json`,
            "Data/Scripts/config/objects.json",
            "Data/Scripts/config/params.json",
            ...sourcePathOptions.filter(
              (path) => path !== "Data/Scripts/src/main.lua",
            ),
            "Data/Scripts/dist/main.lua",
          ].map((path) => (
            <div
              key={path}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-200"
            >
              {path}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
