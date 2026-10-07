import { ScriptParameterValuesEditor } from "./ScriptParameterValuesEditor";
import type { ScriptCustomObjectPlacement, ScriptParameterValues, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

interface Props { workspace: ScriptWorkspaceState; placement: ScriptCustomObjectPlacement; onChange: (values: ScriptParameterValues) => void; }
export function ScriptInstanceParametersPanel({ workspace, placement, onChange }: Props) {
  const definition = workspace.customObjects.find((item) => item.id === placement.objectId);
  return <ScriptParameterValuesEditor parameters={workspace.params} values={placement.parameters ?? {}} inherited={definition?.parameters ?? {}} onChange={onChange} label="Instance behavior parameters" />;
}
