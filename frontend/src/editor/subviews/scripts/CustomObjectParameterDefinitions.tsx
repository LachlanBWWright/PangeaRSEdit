import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { ObjectParameterForm } from "./ObjectParameterForm";
import { removeObjectParameter, saveObjectParameter } from "./scriptObjectParameterActions";
import { ParameterControl, ParameterScope } from "./CustomObjectParameters";
import { setCustomObjectParameterDefault } from "./scriptObjectParameters";

type Editor = { mode: "create" } | { mode: "edit"; parameter: ScriptObjectParameter } | { mode: "remove"; parameter: ScriptObjectParameter };

export function CustomObjectParameterDefinitions({ workspace, definition, update, onError, withDefaults = false }: { workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition; update: UpdateScriptWorkspace; onError: (message: string) => void; withDefaults?: boolean }) {
  const [editor, setEditor] = useState<Editor>();
  return <section className="grid gap-3" aria-label="Behavior setting definitions">
    <div className="flex items-center justify-between gap-2"><h3 className="font-medium">Behavior settings</h3><Button size="sm" variant="outline" onClick={() => setEditor({ mode: "create" })}>Add setting</Button></div>
    <p className="workbench-muted">Shared defaults. Individual placements can override these values.</p>
    {(definition.parameterDefinitions ?? []).map((parameter) => <div key={parameter.id} className="behavior-setting-row">
      {withDefaults ? <ParameterControl parameter={parameter} value={parameter.defaultValue} onChange={(value) => {
        const result = setCustomObjectParameterDefault(workspace, definition.id, parameter.id, value);
        if (result.isErr()) onError(result.error); else update(() => result.value);
      }} /> : <span className="text-sm font-medium">{parameter.label}</span>}
      <details className="workbench-disclosure"><summary>Setting details for {parameter.label}</summary>
        <p>Lua: self.parameters.{parameter.id}</p>
        {parameter.description && <p>{parameter.description}</p>}
        {withDefaults && <ParameterScope workspace={workspace} definition={definition} parameter={parameter} />}
      </details>
      <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditor({ mode: "edit", parameter })}>Edit {parameter.label}</Button><Button size="sm" variant="ghost" onClick={() => setEditor({ mode: "remove", parameter })}>Remove {parameter.label}</Button></div>
    </div>)}
    {editor && editor.mode !== "remove" && <ObjectParameterForm key={editor.mode === "create" ? "new" : editor.parameter.id} parameter={editor.mode === "edit" ? editor.parameter : undefined} onCancel={() => setEditor(undefined)} onSave={(parameter) => {
      const result = saveObjectParameter(workspace, definition.id, parameter, editor.mode === "edit" ? editor.parameter.id : undefined);
      if (result.isErr()) return result.error;
      update(() => result.value);
      setEditor(undefined);
      return undefined;
    }} />}
    {editor?.mode === "remove" && <div className="grid gap-2 rounded border border-amber-700 p-3" role="alert"><p>Remove {editor.parameter.label} from this object and its overrides on every level? Update any Lua references to self.parameters.{editor.parameter.id} before testing.</p><div className="flex gap-2"><Button variant="destructive" onClick={() => {
      const result = removeObjectParameter(workspace, definition.id, editor.parameter.id);
      if (result.isErr()) { onError(result.error); return; }
      update(() => result.value);
      setEditor(undefined);
    }}>Confirm removal</Button><Button variant="ghost" onClick={() => setEditor(undefined)}>Cancel</Button></div></div>}
  </section>;
}
