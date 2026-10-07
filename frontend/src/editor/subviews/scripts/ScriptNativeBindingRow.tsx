import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  subtitle: string;
  sourceFilePath: string;
  tags: readonly string[];
  compatibility: "preview-ready" | "extended-only";
  onRemove: () => void;
  onEditSource?: (path: string) => void;
}

export function ScriptNativeBindingRow({title, subtitle, sourceFilePath, tags, compatibility, onRemove, onEditSource}: Props) {
  return <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3">
    <div className="min-w-0 flex-1">
      <p className="break-words text-sm font-medium text-white">{title}</p>
      <p className="break-words text-xs text-slate-400">{subtitle}</p>
      <details className="mt-1 text-xs text-slate-400">
        <summary className="cursor-pointer">Behavior details</summary>
        <p className="mt-1 break-all font-mono">{sourceFilePath}</p>
        {tags.length > 0 && <p className="mt-1">Tags: {tags.join(", ")}</p>}
        {compatibility === "extended-only" && <p className="mt-1">Requires extended scripting</p>}
      </details>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {onEditSource && <Button size="sm" variant="ghost" onClick={() => onEditSource(sourceFilePath)} aria-label={`Edit ${title} behavior`}>Edit</Button>}
      <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${title} behavior`}>Remove</Button>
    </div>
  </div>;
}
