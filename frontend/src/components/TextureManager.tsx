import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";

interface Texture {
  name: string;
  url: string;
  type: 'diffuse' | 'normal' | 'other';
}

interface TextureManagerProps {
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => void;
}

export function TextureManager({ textures, onDownloadTexture }: TextureManagerProps) {
  if (textures.length === 0) {
    return null;
  }

  return (
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
    </div>
  );
}