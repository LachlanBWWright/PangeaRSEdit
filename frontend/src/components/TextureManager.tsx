import { Button } from "@/components/ui/button";
import { TextureItem } from "./TextureManager/TextureItem";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageEditor } from "./ImageEditor";

interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
}

interface TextureManagerProps {
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => void;
  onReplaceTexture?: (texture: Texture, newFile: File) => Promise<void>;
  onTextureEdit?: (
    texture: Texture,
    editedImageData: ImageData,
  ) => Promise<void>;
}

export function TextureManager({
  textures,
  onDownloadTexture,
  onReplaceTexture,
  onTextureEdit,
}: TextureManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [showPreviews, setShowPreviews] = useState(false);
  const [expandedTextures, setExpandedTextures] = useState<Set<number>>(
    new Set(),
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [textureToEdit, setTextureToEdit] = useState<Texture | null>(null);

  const handleReplaceTexture = async (texture: Texture, file: File) => {
    if (!onReplaceTexture) return;

    try {
      await onReplaceTexture(texture, file);
      toast.success(`Successfully replaced ${texture.name}`);
    } catch (error) {
      toast.error("Failed to replace texture");
    }
  };

  const handleEditTexture = (texture: Texture) => {
    setTextureToEdit(texture);
    setIsEditorOpen(true);
  };

  const handleEditorSave = async (editedImageData: ImageData) => {
    if (!textureToEdit) return;

    try {
      // Use onTextureEdit if available, otherwise fall back to onReplaceTexture
      if (onTextureEdit) {
        await onTextureEdit(textureToEdit, editedImageData);
      } else if (onReplaceTexture) {
        // Convert ImageData to a File
        const canvas = document.createElement("canvas");
        canvas.width = editedImageData.width;
        canvas.height = editedImageData.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.putImageData(editedImageData, 0, 0);

        // Convert canvas to blob and then to file
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, "image/png");
        });

        const file = new File([blob], `${textureToEdit.name}.png`, {
          type: "image/png",
        });
        await onReplaceTexture(textureToEdit, file);
      }
      toast.success(`Successfully updated ${textureToEdit.name}`);
    } catch (error) {
      console.error("Error saving edited texture:", error);
      toast.error("Failed to save edited texture");
    }
  };

  const toggleTextureExpansion = (index: number) => {
    const newExpanded = new Set(expandedTextures);
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
    return (
      <>
        <p className="text-sm text-gray-400">No textures found in this model</p>
      </>
    );
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
        />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && selectedTexture) {
            await handleReplaceTexture(selectedTexture, file);
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
