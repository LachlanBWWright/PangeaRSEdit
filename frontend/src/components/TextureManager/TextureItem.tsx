import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Download,
  Eye,
  Upload,
  Edit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
}: Props) {
  return (
    <div key={index} className="flex flex-col bg-gray-700 rounded p-3">
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
              <span className="truncate">Material: {texture.material}</span>
            )}
            {texture.size && (
              <span>
                {texture.size.width}×{texture.size.height}
              </span>
            )}
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
              <DialogDescription className="text-gray-300">
                Image:
              </DialogDescription>
              <div className="flex justify-center bg-checkered p-4 rounded">
                <img
                  src={texture.url}
                  alt={texture.name}
                  className="max-w-full max-h-96 object-contain border border-gray-600"
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex space-x-2">
                  {onReplaceTextureAvailable && (
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
                    </>
                  )}
                  {onTextureEditAvailable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditTexture(texture)}
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

          {onReplaceTextureAvailable && (
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
