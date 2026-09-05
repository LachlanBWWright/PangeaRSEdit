import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useFeatureFlags } from "@/config/useFeatureFlags";

interface LevelActionMenuProps {
  canPreviewInGame: boolean;
  canSaveToCloud: boolean;
  hasScripts?: boolean;
  onPreviewInGame: () => void;
  onPreviewWithScripts?: () => void;
  onPreviewFromMainMenu?: () => void;
  onPreviewFromMainMenuWithScripts?: () => void;
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
  onPreviewFromMainMenu,
  onPreviewFromMainMenuWithScripts,
  onDownload,
  onDownloadExtendedPackage,
  onDownloadScriptPackage,
  onUploadScriptPackage,
  onSaveToCloud,
}: LevelActionMenuProps) {
  const featureFlags = useFeatureFlags();
  const scriptingEnabled = featureFlags.scripting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="default" variant="outline" className="h-10 gap-2 px-4 font-medium">
          <ChevronDown className="h-4 w-4" />
          Level Actions
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 border-slate-700 bg-slate-800 p-1 text-slate-100"
      >
        {canPreviewInGame && (
          <DropdownMenuItem onSelect={onPreviewInGame}>
            <Gamepad2 className="h-4 w-4" />
            {scriptingEnabled && hasScripts
              ? "Preview in Game (no scripts)"
              : "Preview in Game"}
          </DropdownMenuItem>
        )}
        {scriptingEnabled &&
          canPreviewInGame &&
          hasScripts &&
          onPreviewWithScripts && (
          <DropdownMenuItem onSelect={onPreviewWithScripts}>
            <Code className="h-4 w-4" />
            Preview in Game (scripts)
          </DropdownMenuItem>
        )}
        {canPreviewInGame && onPreviewFromMainMenu && (
          <DropdownMenuItem onSelect={onPreviewFromMainMenu}>
            <Gamepad2 className="h-4 w-4" />
            Preview from Main Menu
          </DropdownMenuItem>
        )}
        {scriptingEnabled &&
          canPreviewInGame &&
          hasScripts &&
          onPreviewFromMainMenuWithScripts && (
          <DropdownMenuItem onSelect={onPreviewFromMainMenuWithScripts}>
            <Code className="h-4 w-4" />
            Preview from Main Menu (scripts)
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onDownload}>
          <Download className="h-4 w-4" />
          Download Level
        </DropdownMenuItem>
        {scriptingEnabled && hasScripts && onDownloadExtendedPackage && (
          <DropdownMenuItem onSelect={onDownloadExtendedPackage}>
            <Package className="h-4 w-4" />
            Download Extended Package
          </DropdownMenuItem>
        )}
        {scriptingEnabled && hasScripts && onDownloadScriptPackage && (
          <DropdownMenuItem onSelect={onDownloadScriptPackage}>
            <FileCode className="h-4 w-4" />
            Download Script Package
          </DropdownMenuItem>
        )}
        {scriptingEnabled && hasScripts && onUploadScriptPackage && (
          <DropdownMenuItem onSelect={onUploadScriptPackage}>
            <Upload className="h-4 w-4" />
            Upload Script Package
          </DropdownMenuItem>
        )}
        {canSaveToCloud && (
          <DropdownMenuItem onSelect={onSaveToCloud}>
            <CloudUpload className="h-4 w-4" />
            Save to Cloud
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
