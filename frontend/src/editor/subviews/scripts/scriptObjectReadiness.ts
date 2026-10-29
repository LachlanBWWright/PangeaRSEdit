import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getObjectUsage } from "./scriptObjectActions";
import { getScriptWorkspaceRevision, type ScriptWorkflowEvidence } from "./scriptWorkflowEvidence";

export interface ObjectReadinessIssue {
  readonly label: string;
  readonly detail: string;
  readonly tone: "warning" | "info";
}

export function getObjectReadiness(
  workspace: ScriptWorkspaceState,
  definition: ScriptCustomObjectDefinition,
  evidence?: ScriptWorkflowEvidence,
  currentRevision = getScriptWorkspaceRevision(workspace),
): readonly ObjectReadinessIssue[] {
  const issues: ObjectReadinessIssue[] = [];
  if (!workspace.sourceFiles[definition.sourceFilePath]) {
    issues.push({ label: "Missing source", detail: definition.sourceFilePath, tone: "warning" });
  }
  const visual = definition.visual;
  const paths = visual.kind === "customSkeleton" ? [visual.modelPath, `${visual.skeletonPath}.rsrc`]
    : visual.kind === "customDisplayGroup" ? [visual.modelPath] : [];
  for (const path of definition.assetId ? [] : paths) {
    if (!workspace.assets[path]) issues.push({ label: "Missing asset", detail: path, tone: "warning" });
  }
  const usage = getObjectUsage(workspace, definition.id);
  if (usage.length === 0) issues.push({ label: "No instances", detail: "Place this object or use it as a native item replacement.", tone: "info" });
  else if (!usage.some((entry) => entry.levelKey === workspace.context.levelKey)) {
    issues.push({ label: "No instances in this level", detail: "This definition is used in other levels.", tone: "info" });
  }
  if (!evidence?.validatedRevision) issues.push({ label: "Not validated", detail: "Build or test the current draft to validate its source and package.", tone: "info" });
  else if (evidence.validatedRevision !== currentRevision) issues.push({ label: "Changed since validation", detail: "The workspace changed after its last successful validation. Build or test again.", tone: "info" });
  if (evidence?.launchedRevision !== currentRevision) issues.push({ label: "Not launched for this draft", detail: "Launch Test level to inspect this draft in the current level. Launching does not verify behavior.", tone: "info" });
  return issues;
}
