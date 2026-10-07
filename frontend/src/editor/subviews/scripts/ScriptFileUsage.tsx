import { Button } from "@/components/ui/button";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { getScriptFileUsageLabels } from "./scriptFileUsage";

export function ScriptFileUsage({ workspace, filePath, onOpenAssignments, returnLabel = "Back to assignments" }: {
  readonly workspace: ScriptWorkspaceState;
  readonly filePath: string;
  readonly onOpenAssignments?: () => void;
  readonly returnLabel?: string;
}) {
  const labels = getScriptFileUsageLabels(workspace, filePath);
  return <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 py-2 text-xs text-slate-400">
    <p className="min-w-0 break-words">{labels.length > 0 ? `Used by ${labels.join(", ")}` : "No direct item or event assignment. This file may be imported by another script."}</p>
    {onOpenAssignments && <Button size="sm" variant="ghost" onClick={onOpenAssignments}>{returnLabel}</Button>}
  </div>;
}
