import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getScriptWorkspaceRevision, type ScriptWorkflowEvidence } from "./scriptWorkflowEvidence";
import { useAtomValue } from "jotai";
import { desktopBridge } from "@/platform/desktop/client";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";
import { scriptStorageStatus } from "./scriptStorageStatus";

export function ScriptWorkflowStatus({ workspace, evidence }: {
  workspace: ScriptWorkspaceState;
  evidence: ScriptWorkflowEvidence;
}) {
  const project = useAtomValue(desktopProjectAtom);
  const projectDirty = useAtomValue(desktopProjectDirtyAtom);
  const revision = getScriptWorkspaceRevision(workspace);
  const drafts = Object.values(workspace.sourceFiles).filter((file) => file.content !== file.savedContent).length;
  const storage = scriptStorageStatus({ desktop: desktopBridge() !== undefined, projectOpen: project !== null, projectDirty });
  return <details className="workbench-disclosure scripting-status" aria-label="Scripting revision status">
    <summary>{drafts > 0 ? "Draft changed" : "No draft changes"} · {storage.label} · {evidence.validatedRevision === revision ? "Validated" : "Needs validation"}</summary>
    <div className="grid gap-2">
    <p>{drafts > 0 ? `${drafts} source file${drafts === 1 ? " has" : "s have"} changes since the last source checkpoint.` : "Sources match their last checkpoints."} Source checkpoints support Revert; they do not save project files to disk.</p>
    <p>{storage.detail}</p>
    <p>Validation: {evidence.validatedRevision === revision ? "Current scripting draft validated" : evidence.validatedRevision ? "Scripting draft changed since validation" : "This scripting draft has not been validated in this session"}.</p>
    <p>Game: {evidence.launchedRevision === revision ? "Preview prepared for this scripting draft" : evidence.launchedRevision ? "Last preview used a different scripting draft" : "No scripted preview prepared in this session"}. Launching does not confirm behavior; verify it in game.</p>
    </div>
  </details>;
}
