import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { TextureDetailDialog } from "@/components/TextureManager/TextureDetailDialog";
import {
  getTextureSizeLabel,
  getTextureTypeBadgeClass,
  triggerTextureReplace,
} from "@/components/TextureManager/textureItemState";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";

interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
}

interface Props {
  texture: Texture;
  index: number;
  expanded: boolean;
  toggleExpansion: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setSelectedTexture: (t: Texture) => void;
  onReplaceTextureAvailable: boolean;
  onTextureEditAvailable: boolean;
  onDownloadTexture: (t: Texture) => void;
  onEditTexture: (t: Texture) => void;
  uvLayout?: UvLayout | null;
  onApplyUvEdit?: (updatedLayout: UvLayout) => void;
}

export function TextureItem({
  texture,
  index,
  expanded,
  toggleExpansion,
  fileInputRef,
  setSelectedTexture,
  onReplaceTextureAvailable,
  onTextureEditAvailable,
  onDownloadTexture,
  onEditTexture,
  uvLayout,
  onApplyUvEdit,
}: Props) {
  const handleReplaceTexture = () => {
    triggerTextureReplace(texture, setSelectedTexture, fileInputRef);
  };

  return (
    <div key={index} className="flex flex-col bg-gray-700 rounded p-3">
      <div className="flex items-center space-x-2 mb-2">
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${getTextureTypeBadgeClass(
            texture.type,
          )}`}
        >
          {texture.type}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate" title={texture.name}>
            {texture.name}
          </div>
          <div className="flex space-x-2 text-xs text-gray-400">
            {texture.material && (
              <span className="truncate">Material: {texture.material}</span>
            )}
            {texture.size && <span>{getTextureSizeLabel(texture.size)}</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleExpansion(index)}
            className="w-8 h-8 p-0"
            title={expanded ? "Hide preview" : "Show preview"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          <TextureDetailDialog
            texture={texture}
            canReplace={onReplaceTextureAvailable}
            canEdit={onTextureEditAvailable}
            uvLayout={uvLayout}
            onReplace={handleReplaceTexture}
            onEdit={() => onEditTexture(texture)}
            onDownload={() => onDownloadTexture(texture)}
            onApplyUvEdit={onApplyUvEdit}
          />
        </div>

        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDownloadTexture(texture)}
            className="w-8 h-8 p-0"
            title="Download texture"
          >
            <Download className="w-4 h-4" />
          </Button>

          {onReplaceTextureAvailable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReplaceTexture}
              className="w-8 h-8 p-0"
              title="Replace texture"
            >
              <Upload className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2">
          <div className="bg-gray-800 rounded p-2 flex justify-center">
            <img
              src={texture.url}
              alt={texture.name}
              className="max-w-full max-h-32 object-contain border border-gray-600 rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
