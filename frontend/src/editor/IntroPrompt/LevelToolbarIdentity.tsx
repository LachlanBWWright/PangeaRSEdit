import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LevelToolbarIdentityProps {
  readonly fileName: string;
  readonly hasUnsavedChanges: boolean;
  readonly onNewMap: () => void;
}

export function LevelToolbarIdentity({ fileName, hasUnsavedChanges, onNewMap }: LevelToolbarIdentityProps) {
  const levelName = fileName.replace(/(?:\.ter(?:\.rsrc)?|\.map|\.rsrc)$/i, "") || fileName;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button type="button" variant="outline" aria-label="New map" title="New map" onClick={onNewMap} className="shrink-0 px-2 sm:px-3">
        <ArrowLeft aria-hidden="true" />
        <span className="hidden sm:inline">New map</span>
      </Button>
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-semibold text-slate-100" title={fileName}>{levelName}</p>
        <p role="status" className={hasUnsavedChanges ? "text-xs leading-tight text-amber-200" : "text-xs leading-tight text-slate-300"}>
          {hasUnsavedChanges ? "Unsaved map" : "Map up to date"}
        </p>
      </div>
    </div>
  );
}
