import { Button } from "@/components/ui/button";

interface ScriptGettingStartedPanelProps {
  hasScripts: boolean;
  onCreateHook: () => void;
  onOpenCode: () => void;
  onCompile: () => void;
  onOpenPreview: () => void;
}

export function ScriptGettingStartedPanel({
  hasScripts,
  onCreateHook,
  onOpenCode,
  onCompile,
  onOpenPreview,
}: ScriptGettingStartedPanelProps) {
  return (
    <section className="grid gap-3 rounded-xl border border-orange-900/60 bg-orange-950/20 p-4">
      <div>
        <h3 className="font-semibold text-white">Make your first script</h3>
        <p className="mt-1 text-xs text-orange-200/80">
          Follow the same loop you will use for larger behaviors: choose an event, write code, compile, and see it in the game.
        </p>
      </div>
      <ol className="grid gap-2 text-sm text-slate-200 md:grid-cols-2">
        <li><span className="font-semibold text-orange-300">1.</span> Choose what should happen. <Button size="sm" variant="ghost" className="h-auto px-1 text-orange-200 underline" onClick={onCreateHook}>Create a level hook</Button></li>
        <li><span className="font-semibold text-orange-300">2.</span> Write or inspect the generated Lua. <Button size="sm" variant="ghost" className="h-auto px-1 text-orange-200 underline" onClick={onOpenCode}>Open Code</Button></li>
        <li><span className="font-semibold text-orange-300">3.</span> Check the generated bundle. <Button size="sm" variant="ghost" className="h-auto px-1 text-orange-200 underline" onClick={onCompile}>Compile</Button></li>
        <li><span className="font-semibold text-orange-300">4.</span> Try it in the selected game. <Button size="sm" variant="ghost" className="h-auto px-1 text-orange-200 underline" onClick={onOpenPreview}>Preview</Button></li>
      </ol>
      {!hasScripts && <p className="text-xs text-orange-200/80">Start with `onLevelStart`; the generated handler includes the correct context type.</p>}
    </section>
  );
}
