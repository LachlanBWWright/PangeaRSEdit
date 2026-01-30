<<<<<<< HEAD
import { Button } from "@/components/ui/button";
import { TextureItem } from "./TextureManager/TextureItem";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageEditor } from "./ImageEditor";
=======
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
>>>>>>> origin/main

interface Texture {
  name: string;
  url: string;
  type: 'diffuse' | 'normal' | 'other';
}

interface TextureManagerProps {
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => void;
}

<<<<<<< HEAD
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
    } catch (_error) {
      // Log and notify but keep UI message the same
      console.error("Failed to replace texture:", _error);
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
          console.error("Failed to get canvas context");
          return;
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

=======
export function TextureManager({ textures, onDownloadTexture }: TextureManagerProps) {
>>>>>>> origin/main
  if (textures.length === 0) {
    return null;
  }

  return (
<<<<<<< HEAD
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
          // Use selectedTexture from closure - it's captured at event handler time
          // This avoids race conditions with React state updates
          const textureToReplace = selectedTexture;
          if (file && textureToReplace) {
            try {
              await handleReplaceTexture(textureToReplace, file);
            } catch (error) {
              console.error(`Failed to replace texture ${textureToReplace.name}:`, error);
              toast.error(`Failed to replace texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
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
=======
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-300">Textures</h4>
      {textures.map((texture, index) => (
        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 capitalize">{texture.type}</span>
            <span className="text-sm">{texture.name}</span>
          </div>
          <div className="flex space-x-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{texture.name}</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center">
                  <img 
                    src={texture.url} 
                    alt={texture.name}
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDownloadTexture(texture)}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
>>>>>>> origin/main
    </div>
  );
}