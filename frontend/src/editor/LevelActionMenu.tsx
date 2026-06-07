import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  CloudUpload,
  Download,
  Gamepad2,
  Code,
  FileCode,
  Upload,
  Package,
} from "lucide-react";

interface LevelActionMenuProps {
  canPreviewInGame: boolean;
  canSaveToCloud: boolean;
  hasScripts?: boolean;
  onPreviewInGame: () => void;
  onPreviewWithScripts?: () => void;
  onDownload: () => void;
  onDownloadExtendedPackage?: () => void;
  onDownloadScriptPackage?: () => void;
  onUploadScriptPackage?: () => void;
  onSaveToCloud: () => void;
}

export function LevelActionMenu({
  canPreviewInGame,
  canSaveToCloud,
  hasScripts = false,
  onPreviewInGame,
  onPreviewWithScripts,
  onDownload,
  onDownloadExtendedPackage,
  onDownloadScriptPackage,
  onUploadScriptPackage,
  onSaveToCloud,
}: LevelActionMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const closeAndRun = (action: () => void) => {
    detailsRef.current?.removeAttribute("open");
    action();
  };

  return (
    <details className="relative z-50 shrink-0" ref={detailsRef}>
      <Button
        asChild
        size="default"
        variant="outline"
        className="h-10 gap-2 px-4 font-medium"
      >
        <summary className="flex h-full list-none items-center gap-2 px-4 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4" />
          Level Actions
        </summary>
      </Button>

      <div className="absolute right-0 top-full z-60 mt-2 min-w-56 overflow-hidden rounded-md border border-slate-700 bg-slate-800 shadow-lg">
        {canPreviewInGame && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onPreviewInGame)}
          >
            <Gamepad2 className="h-4 w-4" />
            {hasScripts ? "Preview in Game (no scripts)" : "Preview in Game"}
          </button>
        )}
        {canPreviewInGame && hasScripts && onPreviewWithScripts && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onPreviewWithScripts)}
          >
            <Code className="h-4 w-4" />
            Preview in Game (scripts)
          </button>
        )}
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
          onClick={() => closeAndRun(onDownload)}
        >
          <Download className="h-4 w-4" />
          Download Level
        </button>
        {hasScripts && onDownloadExtendedPackage && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onDownloadExtendedPackage)}
          >
            <Package className="h-4 w-4" />
            Download Extended Package
          </button>
        )}
        {hasScripts && onDownloadScriptPackage && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onDownloadScriptPackage)}
          >
            <FileCode className="h-4 w-4" />
            Download Script Package
          </button>
        )}
        {hasScripts && onUploadScriptPackage && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onUploadScriptPackage)}
          >
            <Upload className="h-4 w-4" />
            Upload Script Package
          </button>
        )}
        {canSaveToCloud && (
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-white hover:bg-slate-700"
            onClick={() => closeAndRun(onSaveToCloud)}
          >
            <CloudUpload className="h-4 w-4" />
            Save to Cloud
          </button>
        )}
      </div>
    </details>
  );
}
