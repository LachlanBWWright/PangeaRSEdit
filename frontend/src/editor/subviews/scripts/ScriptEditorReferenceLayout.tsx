import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptHookApiExplorer } from "./ScriptHookApiExplorer";
import type { ScriptWorkspaceContext } from "./scriptWorkspaceState";

export function ScriptEditorReferenceLayout({ context, open, onClose, children }: {
  readonly context: ScriptWorkspaceContext;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return <div className={`grid min-w-0 items-start gap-5 ${open ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
    <div className="min-w-0">{children}</div>
    {open && <aside aria-label="Scripting reference" className="min-w-0 border-t border-slate-800 pt-3 xl:sticky xl:top-14 xl:border-l xl:border-t-0 xl:pl-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Scripting reference</h3>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close scripting reference"><X className="size-4" aria-hidden="true" /></Button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        <ScriptHookApiExplorer gameId={context.gameId} supportedHooks={context.supportedHooks} compact />
      </div>
    </aside>}
  </div>;
}
