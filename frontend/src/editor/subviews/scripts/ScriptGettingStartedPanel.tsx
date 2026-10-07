import { Button } from "@/components/ui/button";

interface ScriptGettingStartedPanelProps {
  hasScripts: boolean;
  onCreateHook: () => void;
  onOpenCode: () => void;
  onCompile: () => void;
  onOpenPreview: () => void;
  onCreateItem?: () => void;
}

export function ScriptGettingStartedPanel({
  hasScripts,
  onCreateHook,
  onOpenCode,
  onCompile,
  onOpenPreview,
  onCreateItem,
}: ScriptGettingStartedPanelProps) {
  return (
    <section className="grid gap-4 border-b border-slate-800 pb-6">
      <div>
        <h3 className="font-semibold text-white">{hasScripts ? "Create and test behaviors" : "Start creating"}</h3>
        <p className="mt-1 text-sm text-slate-400">
          Create an item or level behavior, then edit, bundle and preview.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{onCreateItem && <Button onClick={onCreateItem}>Create a new item</Button>}<Button variant="outline" onClick={onCreateHook}>Add a level behavior</Button></div>
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
        <li><span className="mr-1 text-slate-500">1.</span><Button size="sm" variant="ghost" className="px-1" onClick={onOpenCode}>Open Code</Button></li>
        <li><span className="mr-1 text-slate-500">2.</span><Button size="sm" variant="ghost" className="px-1" onClick={onCompile}>Compile</Button></li>
        <li><span className="mr-1 text-slate-500">3.</span><Button size="sm" variant="ghost" className="px-1" onClick={onOpenPreview}>Preview</Button></li>
      </ol>
      {!hasScripts && <p className="text-xs text-slate-400">Item definitions are shared across a game; placements belong to individual levels.</p>}
    </section>
  );
}
