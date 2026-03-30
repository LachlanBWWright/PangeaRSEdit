import { Button } from "@/components/ui/button";
import { TextureItem } from "./TextureManager/TextureItem";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageEditor } from "./ImageEditor";
import { fromPromise } from "@/types/result";

interface Texture {
  name: string;
  url: string;
  type: 'diffuse' | 'normal' | 'other';
}

interface TextureManagerProps {
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => void;
  onReplaceTexture?: (texture: Texture, file: File) => Promise<void>;
  onTextureEdit?: (texture: Texture, editedImageData: ImageData) => Promise<void>;
}

export function TextureManager({
  textures,
  onDownloadTexture,
  onReplaceTexture,
  onTextureEdit,
}: TextureManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [showPreviews, setShowPreviews] = useState(true);
  const [expandedTextures, setExpandedTextures] = useState<Set<number> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [textureToEdit, setTextureToEdit] = useState<Texture | null>(null);
  const effectiveExpandedTextures = useMemo(
    () => expandedTextures ?? new Set(textures.map((_, index) => index)),
    [expandedTextures, textures],
  );

  const handleReplaceTexture = async (texture: Texture, file: File) => {
    if (!onReplaceTexture) return;

    const result = await fromPromise(onReplaceTexture(texture, file));
    if (result.isErr()) {
      console.error("Failed to replace texture:", result.error);
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
      const result = await fromPromise(onTextureEdit(textureToEdit, editedImageData));
      if (result.isErr()) {
        console.error("Error saving edited texture:", result.error);
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
      const blobResult = await fromPromise(
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to convert canvas to blob"));
          }, "image/png");
        })
      );

      if (blobResult.isErr()) {
        console.error("Error saving edited texture:", blobResult.error);
        toast.error("Failed to save edited texture");
        return;
      }

      const blob = blobResult.value;
      const file = new File([blob], `${textureToEdit.name}.png`, {
        type: "image/png",
      });

      const replaceResult = await fromPromise(onReplaceTexture(textureToEdit, file));
      if (replaceResult.isErr()) {
        console.error("Error saving edited texture:", replaceResult.error);
        toast.error("Failed to save edited texture");
        return;
      }
    }
    toast.success(`Successfully updated ${textureToEdit.name}`);
  };

  const toggleTextureExpansion = (index: number) => {
    const newExpanded = new Set(effectiveExpandedTextures);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTextures(newExpanded);
  };

  const toggleAllPreviews = () => {
    if (showPreviews) {
      // If hiding previews, collapse all expanded textures
      setExpandedTextures(new Set());
    } else {
      // If showing previews, expand all textures
      setExpandedTextures(new Set(textures.map((_, index) => index)));
    }
    setShowPreviews(!showPreviews);
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
          expanded={effectiveExpandedTextures.has(index)}
          toggleExpansion={toggleTextureExpansion}
          fileInputRef={fileInputRef}
          setSelectedTexture={setSelectedTexture}
          onReplaceTextureAvailable={!!onReplaceTexture}
          onTextureEditAvailable={!!onTextureEdit}
          onDownloadTexture={onDownloadTexture}
          onEditTexture={handleEditTexture}
        />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Use selectedTexture from closure - it's captured at event handler time
          // This avoids race conditions with React state updates
          const textureToReplace = selectedTexture;
          if (file && textureToReplace) {
            await handleReplaceTexture(textureToReplace, file);
            // Reset input value to allow re-selecting the same file
            e.target.value = "";
            // Clear selected texture after replacement
            setSelectedTexture(null);
          } else {
            if (!textureToReplace) {
              console.error("No texture selected for replacement");
              toast.error("No texture selected");
            }
            if (!file) {
              console.error("No file selected");
            }
            e.target.value = "";
          }
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
