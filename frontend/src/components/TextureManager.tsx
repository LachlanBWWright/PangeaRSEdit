import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Upload, Edit } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

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

  const handleReplaceTexture = async (texture: Texture, file: File) => {
    if (!onReplaceTexture) return;

    try {
      await onReplaceTexture(texture, file);
      toast.success(`Successfully replaced ${texture.name}`);
    } catch (error) {
      toast.error("Failed to replace texture");
    }
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
      {textures.map((texture, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 bg-gray-700 rounded"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
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
              <div className="text-sm truncate" title={texture.name}>
                {texture.name}
              </div>
              {texture.material && (
                <div className="text-xs text-gray-400 truncate">
                  Material: {texture.material}
                </div>
              )}
              {texture.size && (
                <div className="text-xs text-gray-400">
                  {texture.size.width}×{texture.size.height}
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-1 ml-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{texture.name}</span>
                    <span className="text-sm text-gray-400">
                      {texture.type} •{" "}
                      {texture.size
                        ? `${texture.size.width}×${texture.size.height}`
                        : "Unknown size"}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription>Image:</DialogDescription>
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
                        onClick={() => console.log("Edit texture:", texture)}
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

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDownloadTexture(texture)}
              className="w-8 h-8 p-0"
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
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}
          </div>
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
    </div>
  );
}
