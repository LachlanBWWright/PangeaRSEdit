import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Upload, Edit, ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandedTextures, setExpandedTextures] = useState<Set<number>>(new Set());
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
        const canvas = document.createElement('canvas');
        canvas.width = editedImageData.width;
        canvas.height = editedImageData.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.putImageData(editedImageData, 0, 0);
        
        // Convert canvas to blob and then to file
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png');
        });

        const file = new File([blob], `${textureToEdit.name}.png`, { type: 'image/png' });
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
          {textures.length} texture{textures.length !== 1 ? 's' : ''} found
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleAllPreviews}
          className="text-xs text-gray-300 hover:text-white"
        >
          {showPreviews ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>
      
      {textures.map((texture, index) => (
        <div
          key={index}
          className="flex flex-col bg-gray-700 rounded p-3"
        >
          {/* Text row */}
          <div className="flex items-center space-x-2 mb-2">
            <span
              className={`text-xs px-2 py-1 rounded capitalize ${
                texture.type === "diffuse"
                  ? "bg-blue-600"
                  : texture.type === "normal"
                  ? "bg-purple-600"
                  : "bg-gray-600"
              }`}
            >
              {texture.type}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate" title={texture.name}>
                {texture.name}
              </div>
              <div className="flex space-x-2 text-xs text-gray-400">
                {texture.material && (
                  <span className="truncate">
                    Material: {texture.material}
                  </span>
                )}
                {texture.size && (
                  <span>
                    {texture.size.width}×{texture.size.height}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleTextureExpansion(index)}
                className="w-8 h-8 p-0"
                title={expandedTextures.has(index) ? "Hide preview" : "Show preview"}
              >
                {expandedTextures.has(index) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl text-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between text-white">
                      <span>{texture.name}</span>
                      <span className="text-sm text-gray-400">
                        {texture.type} •{" "}
                        {texture.size
                          ? `${texture.size.width}×${texture.size.height}`
                          : "Unknown size"}
                      </span>
                    </DialogTitle>
                  </DialogHeader>
                  <DialogDescription className="text-gray-300">Image:</DialogDescription>
                  <div className="flex justify-center bg-checkered p-4 rounded">
                    <img
                      src={texture.url}
                      alt={texture.name}
                      className="max-w-full max-h-96 object-contain border border-gray-600"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        // Update texture size if not available
                        if (!texture.size) {
                          texture.size = {
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                          };
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      {onReplaceTexture && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTexture(texture);
                              fileInputRef.current?.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Replace
                          </Button>
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
                        </>
                      )}
                      {onTextureEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTexture(texture)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadTexture(texture)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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

              {onReplaceTexture && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTexture(texture);
                    fileInputRef.current?.click();
                  }}
                  className="w-8 h-8 p-0"
                  title="Replace texture"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Inline texture preview */}
          {expandedTextures.has(index) && (
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
