import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseScriptSourceDirectory,
  SCRIPT_SOURCE_DIRECTORY_OPTIONS,
  type ScriptSourceDirectory,
} from "./scriptWorkspaceHelpers";
import type { ScriptSourceFile } from "./scriptWorkspaceState";

interface ScriptProjectFilesPanelProps {
  newFileName: string;
  onNewFileNameChange: (value: string) => void;
  newFileDirectory: ScriptSourceDirectory;
  onNewFileDirectoryChange: (value: ScriptSourceDirectory) => void;
  generatedNewFilePath: string;
  onCreateSourceFile: () => void;
  orderedSourcePaths: readonly string[];
  compiledFilePaths: readonly string[];
  activeFilePath: string;
  sourceFiles: Readonly<Record<string, ScriptSourceFile>>;
  onOpenFile: (path: string) => void;
  isSourceFileDirty: (path: string) => boolean;
}

export function ScriptProjectFilesPanel({
  newFileName,
  onNewFileNameChange,
  newFileDirectory,
  onNewFileDirectoryChange,
  generatedNewFilePath,
  onCreateSourceFile,
  orderedSourcePaths,
  compiledFilePaths,
  activeFilePath,
  sourceFiles,
  onOpenFile,
  isSourceFileDirty,
}: ScriptProjectFilesPanelProps) {
  return (
    <section>
      <h3 className="mb-4 font-semibold text-white">Project Files</h3>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="new-script-file">Add file</Label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="new-script-file"
              value={newFileName}
              onChange={(event) => onNewFileNameChange(event.target.value)}
              placeholder="helpers"
            />
            <Button variant="outline" onClick={onCreateSourceFile}>Add</Button>
            <Select
              value={newFileDirectory}
              onValueChange={(value) =>
                onNewFileDirectoryChange(parseScriptSourceDirectory(value))
              }
            >
              <SelectTrigger className="col-span-2" aria-label="Script file folder">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_SOURCE_DIRECTORY_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="break-all text-xs text-slate-500"><code>{generatedNewFilePath}</code></p>
        </div>

        <div className="grid">
          <p className="mb-2 text-sm font-medium text-slate-400">
            Source
          </p>
          {orderedSourcePaths.map((path) => {
            const sourceFile = sourceFiles[path];
            return (
              <Button
                key={path}
                variant="ghost"
                aria-pressed={activeFilePath === path}
                className={`h-auto min-w-0 justify-start rounded-none border-l-2 py-2 ${activeFilePath === path ? "border-blue-400 bg-blue-500/10" : "border-transparent"}`}
                title={path}
                onClick={() => onOpenFile(path)}
                type="button"
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate font-medium text-white">
                    {path.replace("Data/Scripts/src/", "")}
                  </span>
                  {sourceFile?.role === "generated-entry" ? (
                    <span className="shrink-0 text-xs font-normal text-slate-500">Generated</span>
                  ) : isSourceFileDirty(path) ? (
                    <span className="shrink-0 text-xs font-normal text-amber-300">Unsaved</span>
                  ) : (
                    null
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        <div className="grid border-t border-slate-800 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-400">
            Build Output
          </p>
          {compiledFilePaths.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Validate the bundle to inspect generated output.
            </p>
          ) : (
            compiledFilePaths.map((path) => (
              <Button
                key={path}
                variant="ghost"
                aria-pressed={activeFilePath === path}
                className={`h-auto min-w-0 justify-start rounded-none border-l-2 py-2 ${activeFilePath === path ? "border-blue-400 bg-blue-500/10" : "border-transparent"}`}
                title={path}
                onClick={() => onOpenFile(path)}
                type="button"
              >
                <span className="truncate font-medium text-white">
                  {path.replace("Data/Scripts/dist/", "")}
                </span>
              </Button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
