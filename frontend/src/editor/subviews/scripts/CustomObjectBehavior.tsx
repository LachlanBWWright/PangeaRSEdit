import { Button } from "@/components/ui/button";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { addObjectHandler } from "./scriptObjectHandlers";
import { ScriptSourceEditor } from "./ScriptSourceEditor";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { desktopBridge } from "@/platform/desktop/client";
import { DesktopScriptSource } from "@/platform/desktop/DesktopScriptSource";
import { CustomObjectParameters } from "./CustomObjectParameters";
import { objectLuaLayout } from "./scriptObjectLuaLayout";

export function CustomObjectBehavior({ workspace, definition, update, onError }: {
  workspace: ScriptWorkspaceState;
  definition: ScriptCustomObjectDefinition;
  update: UpdateScriptWorkspace;
  onError: (message: string) => void;
}) {
  const content = workspace.sourceFiles[definition.sourceFilePath]?.content ?? "";
  const layout = objectLuaLayout(content, definition.exportName);
  return <div className="grid gap-5">
    <CustomObjectParameters workspace={workspace} definition={definition} update={update} onError={onError} />
    <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-medium">Object events and cleanup</summary>
      <p className="workbench-muted mt-3">Callbacks receive self.handle and a read-only context. Keep instance values in pangea.object.state(self.handle).</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{SCRIPTING_CONTRACT.objectEvents.map((event) => {
        const exists = layout.isOk() && layout.value.handlers.has(event.handler);
        return <div key={event.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-900/60 p-3"><div><p className="text-sm">{event.handler}</p><p className="workbench-muted">{event.cleanup === "owner-resources" ? "Releases owned resources. " : ""}{event.statePolicy === "clear" ? "Clears instance state." : "Keeps instance state."}</p></div><Button variant="ghost" size="sm" disabled={exists} onClick={() => {
          const result = addObjectHandler(workspace, definition, event.handler);
          if (result.isErr()) onError(result.error); else update(() => result.value);
        }}>{exists ? "Added" : "Add"}</Button></div>;
      })}</div>
    </details>
    {desktopBridge() ? <DesktopScriptSource path={definition.sourceFilePath} content={content} /> : <ScriptSourceEditor workspace={workspace} path={definition.sourceFilePath} update={update} />}
  </div>;
}
