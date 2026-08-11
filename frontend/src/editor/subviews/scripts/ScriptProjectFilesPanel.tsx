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
import { StatusChip } from "./ScriptSharedComponents";
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
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <Input
              id="new-script-file"
              value={newFileName}
              onChange={(event) => onNewFileNameChange(event.target.value)}
              placeholder="helpers"
            />
            <Select
              value={newFileDirectory}
              onValueChange={(value) =>
                onNewFileDirectoryChange(parseScriptSourceDirectory(value))
              }
            >
              <SelectTrigger>
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
            <Button variant="outline" onClick={onCreateSourceFile}>
              Add
            </Button>
          </div>
          <Input value={generatedNewFilePath} readOnly />
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Source
          </p>
          {orderedSourcePaths.map((path) => {
            const sourceFile = sourceFiles[path];
            return (
              <Button
                key={path}
                variant="menu"
                aria-pressed={activeFilePath === path}
                className={`h-auto border-l-2 py-2 ${activeFilePath === path ? "border-orange-400 bg-orange-500/10" : "border-transparent"}`}
                onClick={() => onOpenFile(path)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-white">
                    {path.replace("Data/Scripts/src/", "")}
                  </span>
                  {sourceFile?.role === "generated-entry" ? (
                    <StatusChip label="Generated" tone="warning" />
                  ) : isSourceFileDirty(path) ? (
                    <StatusChip label="Dirty" tone="danger" />
                  ) : (
                    <StatusChip label="Saved" tone="good" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Build Output
          </p>
          {compiledFilePaths.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Compile the project to inspect bundled output.
            </p>
          ) : (
            compiledFilePaths.map((path) => (
              <Button
                key={path}
                variant="menu"
                aria-pressed={activeFilePath === path}
                className={`h-auto border-l-2 py-2 ${activeFilePath === path ? "border-orange-400 bg-orange-500/10" : "border-transparent"}`}
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
