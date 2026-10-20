import { Button } from "@/components/ui/button";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { addObjectHandler } from "./scriptObjectHandlers";
import { ScriptSourceEditor } from "./ScriptSourceEditor";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function CustomObjectBehavior({ workspace, definition, update, onError }: {
  workspace: ScriptWorkspaceState;
  definition: ScriptCustomObjectDefinition;
  update: UpdateScriptWorkspace;
  onError: (message: string) => void;
}) {
  const content = workspace.sourceFiles[definition.sourceFilePath]?.content ?? "";
  return <div className="grid gap-5">
    <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-medium">Object events and cleanup</summary>
      <p className="workbench-muted mt-3">Callbacks receive self.handle and a read-only context. Keep instance values in pangea.object.state(self.handle).</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{SCRIPTING_CONTRACT.objectEvents.map((event) => {
        const exists = content.includes(`.${event.handler}`);
        return <div key={event.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-900/60 p-3"><div><p className="text-sm">{event.handler}</p><p className="workbench-muted">{event.cleanup === "owner-resources" ? "Releases owned resources. " : ""}{event.statePolicy === "clear" ? "Clears instance state." : "Keeps instance state."}</p></div><Button variant="ghost" size="sm" disabled={exists} onClick={() => {
          const result = addObjectHandler(workspace, definition, event.handler);
          if (result.isErr()) onError(result.error); else update(() => result.value);
        }}>{exists ? "Added" : "Add"}</Button></div>;
      })}</div>
    </details>
    <ScriptSourceEditor workspace={workspace} path={definition.sourceFilePath} update={update} />
  </div>;
}
