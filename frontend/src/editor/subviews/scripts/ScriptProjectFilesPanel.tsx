import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  parseScriptSourceLanguage,
  SCRIPT_SOURCE_DIRECTORY_OPTIONS,
  SCRIPT_SOURCE_LANGUAGE_OPTIONS,
  type ScriptSourceDirectory,
  type ScriptSourceLanguage,
} from "./scriptWorkspaceHelpers";
import type { ScriptSourceFile } from "./scriptWorkspaceState";

interface ScriptProjectFilesPanelProps {
  newFileName: string;
  onNewFileNameChange: (value: string) => void;
  newFileDirectory: ScriptSourceDirectory;
  onNewFileDirectoryChange: (value: ScriptSourceDirectory) => void;
  newFileLanguage: ScriptSourceLanguage;
  onNewFileLanguageChange: (value: ScriptSourceLanguage) => void;
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
  newFileLanguage,
  onNewFileLanguageChange,
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
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-white">Project Files</CardTitle>
        <CardDescription>
          Edit source modules, inspect the generated entry script, and
          compile the bundled runtime output that the browser preview
          executes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="new-script-file">Add file</Label>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
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
            <Select
              value={newFileLanguage}
              onValueChange={(value) =>
                onNewFileLanguageChange(parseScriptSourceLanguage(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_SOURCE_LANGUAGE_OPTIONS.map((option) => (
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
              <button
                key={path}
                className={`rounded-xl border px-3 py-2 text-left ${activeFilePath === path ? "border-orange-400 bg-orange-500/10" : "border-slate-800 bg-slate-900/80"}`}
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
              </button>
            );
          })}
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Build Output
          </p>
          {compiledFilePaths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
              Compile the project to inspect bundled output.
            </div>
          ) : (
            compiledFilePaths.map((path) => (
              <button
                key={path}
                className={`rounded-xl border px-3 py-2 text-left ${activeFilePath === path ? "border-orange-400 bg-orange-500/10" : "border-slate-800 bg-slate-900/80"}`}
                onClick={() => onOpenFile(path)}
                type="button"
              >
                <span className="truncate font-medium text-white">
                  {path.replace("Data/Scripts/dist/", "")}
                </span>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}