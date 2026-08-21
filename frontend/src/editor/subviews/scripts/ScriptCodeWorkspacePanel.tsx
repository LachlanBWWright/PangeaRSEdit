import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusChip } from "./ScriptSharedComponents";
import type { ScriptDiagnostic } from "./scriptWorkspaceState";
import { MenuEmptyState } from "../MenuEmptyState";

function diagnosticCategoryLabel(category: ScriptDiagnostic["category"]): string {
  if (category === "source-validation") return "Source validation";
  if (category === "luals") return "LuaLS";
  if (category === "packaging") return "Packaging";
  if (category === "runtime-traceback") return "Runtime traceback";
  return "Native adapter";
}

interface ScriptCodeWorkspacePanelProps {
  activeCodePath: string | null;
  activeCodeDescription: string;
  hasActiveCodeFile: boolean;
  onOpenEditor: () => void;
  onCompile: () => void;
  buildErrorCount: number;
  diagnostics: readonly ScriptDiagnostic[];
}

export function ScriptCodeWorkspacePanel({
  activeCodePath,
  activeCodeDescription,
  hasActiveCodeFile,
  onOpenEditor,
  onCompile,
  buildErrorCount,
  diagnostics,
}: ScriptCodeWorkspacePanelProps) {
  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white">Code</CardTitle>
            <CardDescription>
              Select a file to edit it in a full modal, then compile to update
              diagnostics and runtime output.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCompile}>
              Compile
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {hasActiveCodeFile && activeCodePath !== null ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {activeCodePath}
                </p>
                <p className="text-xs text-slate-400">
                  {activeCodeDescription}
                </p>
              </div>
              <Button onClick={onOpenEditor}>Open Editor</Button>
            </div>
          </div>
        ) : (
          <MenuEmptyState
            title="No File Selected"
            description={activeCodeDescription}
            compact
          />
        )}

        <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-white">Diagnostics</p>
            <StatusChip
              label={`${String(buildErrorCount)} build errors`}
              tone={buildErrorCount > 0 ? "danger" : "good"}
            />
          </div>
          {diagnostics.length === 0 ? (
            <p className="text-xs text-slate-400">
              No compile diagnostics yet.
            </p>
          ) : (
            diagnostics.map((diagnostic, index) => (
              <div
                key={`${diagnostic.filePath}-${String(index)}`}
                className="rounded-lg border border-slate-800 bg-slate-950/80 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">
                    {diagnostic.filePath}
                  </p>
                  <StatusChip
                    label={`${diagnosticCategoryLabel(diagnostic.category)} · ${String(diagnostic.code)}`}
                    tone={
                      diagnostic.severity === "error" ? "danger" : "warning"
                    }
                  />
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  {diagnostic.message}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Line {String(diagnostic.line)}, Column{" "}
                  {String(diagnostic.column)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
