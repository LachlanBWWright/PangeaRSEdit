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
  onPreview: () => void;
  onCompile: () => void;
  onDownloadExtendedPackage: () => void;
  onDownloadOriginalCompatible: () => void;
  onDownloadScriptPackage: () => void;
  onUploadScriptPackage: () => void;
  statusLog: readonly string[];
  levelKey: string;
  sourcePathOptions: readonly string[];
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
}: ScriptPreviewExportPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <div className="grid gap-4">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Preview and Export</CardTitle>
            <CardDescription>
              Preview injects the generated bundle and sidecars into the
              existing browser runtime path. Original-compatible exports
              omit scripts conservatively; extended packages include both
              the native level files and Data/Scripts payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Button onClick={onPreview} disabled={isPreparingPreview}>
              {isPreparingPreview
                ? "Preparing Preview..."
                : "Preview in Game"}
            </Button>
            <Button variant="outline" onClick={onCompile}>
              Compile Bundle
            </Button>
            <Button
              variant="outline"
              onClick={onDownloadExtendedPackage}
            >
              Download Extended Package
            </Button>
            <Button
              variant="outline"
              onClick={onDownloadOriginalCompatible}
            >
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
              <p className="text-xs text-slate-400">
                No recent log entries.
              </p>
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

      <div className="grid gap-4">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Package Contents</CardTitle>
            <CardDescription>
              These are the editor-owned files that the Scripts workspace
              writes into Data/Scripts.
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
                (path) => path !== "Data/Scripts/src/main.ts",
              ),
              "Data/Scripts/dist/main.js",
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

        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">
              Compatibility Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-medium text-white">Preview</p>
              <p className="mt-1">
                Preview writes the compiled bundle and config files into the
                browser runtime VFS before the wasm port boots.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-medium text-white">
                Original-Compatible Export
              </p>
              <p className="mt-1">
                Script sidecars are omitted intentionally so the native
                level files remain conservative and backwards-compatible.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <p className="font-medium text-white">Extended Package</p>
              <p className="mt-1">
                Extended packages include the original level output under
                Original/ plus the generated Data/Scripts package for
                editor-aware builds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}