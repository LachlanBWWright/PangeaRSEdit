import { Button } from "@/components/ui/button";
import { TextureItem } from "./TextureManager/TextureItem";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageEditor } from "./ImageEditor";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import {
  createInitiallyExpandedTextureSet,
  getNextPreviewState,
  handleTextureFileInputChange,
  toggleExpandedTextureIndex,
} from "@/components/TextureManager/textureManagerState";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";

export interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
}

interface TextureManagerProps {
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => void;
  onReplaceTexture?: (texture: Texture, file: File) => Promise<void>;
  onTextureEdit?: (
    texture: Texture,
    editedImageData: ImageData,
  ) => Promise<void>;
  uvLayouts?: ReadonlyMap<string, UvLayout>;
  onPreviewUvEdit?: (textureName: string, updatedLayout: UvLayout) => void;
  onResetUvPreview?: (textureName: string) => void;
  onApplyUvEdit?: (textureName: string, updatedLayout: UvLayout) => void;
}

export function TextureManager({
  textures,
  onDownloadTexture,
  onReplaceTexture,
  onTextureEdit,
  uvLayouts,
  onPreviewUvEdit,
  onResetUvPreview,
  onApplyUvEdit,
}: TextureManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [showPreviews, setShowPreviews] = useState(true);
  const [expandedTextures, setExpandedTextures] = useState<Set<number>>(() =>
    createInitiallyExpandedTextureSet(textures.length),
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [textureToEdit, setTextureToEdit] = useState<Texture | null>(null);

  const handleReplaceTexture = async (texture: Texture, file: File) => {
    if (!onReplaceTexture) return;

    const replaceResult = await ResultAsync.fromPromise(
      onReplaceTexture(texture, file),
      mapErr,
    );
    if (replaceResult.isErr()) {
      console.error("Failed to replace texture:", replaceResult.error);
      toast.error("Failed to replace texture");
      return;
    }
    toast.success(`Successfully replaced ${texture.name}`);
  };

  const handleEditTexture = (texture: Texture) => {
    setTextureToEdit(texture);
    setIsEditorOpen(true);
  };

  const handleEditorSave = async (editedImageData: ImageData) => {
    if (!textureToEdit) return;

    // Use onTextureEdit if available, otherwise fall back to onReplaceTexture
    if (onTextureEdit) {
      const editResult = await ResultAsync.fromPromise(
        onTextureEdit(textureToEdit, editedImageData),
        mapErr,
      );
      if (editResult.isErr()) {
        console.error("Error saving edited texture:", editResult.error);
        toast.error("Failed to save edited texture");
        return;
      }
    } else if (onReplaceTexture) {
      // Convert ImageData to a File
      const canvas = document.createElement("canvas");
      canvas.width = editedImageData.width;
      canvas.height = editedImageData.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("Failed to get canvas context");
        toast.error("Failed to save edited texture");
        return;
      }

      ctx.putImageData(editedImageData, 0, 0);

      // Convert canvas to blob and then to file
      const blobResult = await ResultAsync.fromPromise(
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to convert canvas to blob"));
          }, "image/png");
        }),
        mapErr,
      );
      if (blobResult.isErr()) {
        console.error("Failed to convert canvas to blob", blobResult.error);
        toast.error("Failed to save edited texture");
        return;
      }
      const blob = blobResult.value;
      const file = new File([blob], `${textureToEdit.name}.png`, {
        type: "image/png",
      });

      const replaceResult = await ResultAsync.fromPromise(
        onReplaceTexture(textureToEdit, file),
        mapErr,
      );
      if (replaceResult.isErr()) {
        console.error("Error saving edited texture:", replaceResult.error);
        toast.error("Failed to save edited texture");
        return;
      }
    }
    toast.success(`Successfully updated ${textureToEdit.name}`);
  };

  const toggleTextureExpansion = (index: number) => {
    setExpandedTextures((current) =>
      toggleExpandedTextureIndex(current, index),
    );
  };

  const toggleAllPreviews = () => {
    const nextPreviewState = getNextPreviewState(showPreviews, textures.length);
    setExpandedTextures(nextPreviewState.expandedTextures);
    setShowPreviews(nextPreviewState.showPreviews);
  };

  if (textures.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">
          {textures.length} texture{textures.length !== 1 ? "s" : ""} found
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleAllPreviews}
          className="text-xs text-gray-300 hover:text-white"
        >
          {showPreviews ? "Collapse All" : "Expand All"}
        </Button>
      </div>

      {textures.map((texture, index) => (
        <TextureItem
          key={index}
          texture={texture}
          index={index}
          expanded={expandedTextures.has(index)}
          toggleExpansion={toggleTextureExpansion}
          fileInputRef={fileInputRef}
          setSelectedTexture={setSelectedTexture}
          onReplaceTextureAvailable={!!onReplaceTexture}
          onTextureEditAvailable={!!onTextureEdit}
          onDownloadTexture={onDownloadTexture}
          onEditTexture={handleEditTexture}
          uvLayout={uvLayouts?.get(texture.name)}
          onPreviewUvEdit={
            onPreviewUvEdit
              ? (layout) => onPreviewUvEdit(texture.name, layout)
              : undefined
          }
          onResetUvPreview={
            onResetUvPreview ? () => onResetUvPreview(texture.name) : undefined
          }
          onApplyUvEdit={
            onApplyUvEdit
              ? (layout) => onApplyUvEdit(texture.name, layout)
              : undefined
          }
        />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          await handleTextureFileInputChange({
            event: e,
            selectedTexture,
            handleReplaceTexture,
            clearSelectedTexture: () => setSelectedTexture(null),
          });
        }}
      />

      {/* Image Editor */}
      {textureToEdit && (
        <ImageEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setTextureToEdit(null);
          }}
          imageUrl={textureToEdit.url}
          imageName={textureToEdit.name}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}
