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
import { ENABLE_SCRIPTS } from "@/config/featureFlags";

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
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onPreviewInGame)}
          >
            <Gamepad2 className="h-4 w-4" />
            {ENABLE_SCRIPTS && hasScripts
              ? "Preview in Game (no scripts)"
              : "Preview in Game"}
          </Button>
        )}
        {ENABLE_SCRIPTS &&
          canPreviewInGame &&
          hasScripts &&
          onPreviewWithScripts && (
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onPreviewWithScripts)}
          >
            <Code className="h-4 w-4" />
            Preview in Game (scripts)
          </Button>
        )}
        <Button
          type="button"
          variant="menu"
          onClick={() => closeAndRun(onDownload)}
        >
          <Download className="h-4 w-4" />
          Download Level
        </Button>
        {ENABLE_SCRIPTS && hasScripts && onDownloadExtendedPackage && (
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onDownloadExtendedPackage)}
          >
            <Package className="h-4 w-4" />
            Download Extended Package
          </Button>
        )}
        {ENABLE_SCRIPTS && hasScripts && onDownloadScriptPackage && (
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onDownloadScriptPackage)}
          >
            <FileCode className="h-4 w-4" />
            Download Script Package
          </Button>
        )}
        {ENABLE_SCRIPTS && hasScripts && onUploadScriptPackage && (
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onUploadScriptPackage)}
          >
            <Upload className="h-4 w-4" />
            Upload Script Package
          </Button>
        )}
        {canSaveToCloud && (
          <Button
            type="button"
            variant="menu"
            onClick={() => closeAndRun(onSaveToCloud)}
          >
            <CloudUpload className="h-4 w-4" />
            Save to Cloud
          </Button>
        )}
      </div>
    </details>
  );
}
