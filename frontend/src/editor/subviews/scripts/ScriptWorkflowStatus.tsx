import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getScriptWorkspaceRevision, type ScriptWorkflowEvidence } from "./scriptWorkflowEvidence";
import { useAtomValue } from "jotai";
import { desktopBridge } from "@/platform/desktop/client";
import { desktopProjectAtom, desktopProjectDirtyAtom } from "@/platform/desktop/projectState";

export function ScriptWorkflowStatus({ workspace, evidence }: {
  workspace: ScriptWorkspaceState;
  evidence: ScriptWorkflowEvidence;
}) {
  const project = useAtomValue(desktopProjectAtom);
  const projectDirty = useAtomValue(desktopProjectDirtyAtom);
  const revision = getScriptWorkspaceRevision(workspace);
  const drafts = Object.values(workspace.sourceFiles).filter((file) => file.content !== file.savedContent).length;
  return <div className="workbench-notice grid gap-1 text-xs" aria-label="Scripting revision status">
    <p>Workspace: {drafts > 0 ? `${drafts} source draft${drafts === 1 ? "" : "s"} beyond the revert checkpoint` : "Source matches workspace checkpoints"}. Workspace storage is separate from saving project files to disk.</p>
    <p>{desktopBridge()
      ? project ? projectDirty ? "Project: unsaved changes. Save All writes project files to disk." : "Project: project files saved to disk." : "Project: open a project to save files to disk."
      : "Browser: changes stay in the local workspace. Export a script package for a portable backup."}</p>
    <p>Validation: {evidence.validatedRevision === revision ? "Current scripting draft validated" : evidence.validatedRevision ? "Scripting draft changed since validation" : "This scripting draft has not been validated in this session"}.</p>
    <p>Game: {evidence.launchedRevision === revision ? "Preview prepared for this scripting draft" : evidence.launchedRevision ? "Last preview used a different scripting draft" : "No scripted preview prepared in this session"}. Launching does not confirm behavior; verify it in game.</p>
  </div>;
}
