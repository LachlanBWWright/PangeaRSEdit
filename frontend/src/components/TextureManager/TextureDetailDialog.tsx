import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Edit, Eye, Upload } from "lucide-react";
import { useState } from "react";
import { getTextureSizeLabel } from "@/components/TextureManager/textureItemState";
import { UvMapEditor } from "@/components/TextureManager/UvMapEditor";
import { UvAssignmentPanel } from "@/components/TextureManager/UvAssignmentPanel";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";

interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
}

interface TextureDetailDialogProps {
  texture: Texture;
  canReplace: boolean;
  canEdit: boolean;
  uvLayout?: UvLayout | null;
  onReplace: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onPreviewUvEdit?: (updatedLayout: UvLayout) => void;
  onResetUvPreview?: () => void;
  onApplyUvEdit?: (updatedLayout: UvLayout) => void;
}

export function TextureDetailDialog({
  texture,
  canReplace,
  canEdit,
  uvLayout,
  onReplace,
  onEdit,
  onDownload,
  onPreviewUvEdit,
  onResetUvPreview,
  onApplyUvEdit,
}: TextureDetailDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          onResetUvPreview?.();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="w-8 h-8 p-0"
          title="Open texture details"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[1400px] flex-col overflow-hidden text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white">
            <span>{texture.name}</span>
            <span className="text-sm text-gray-400">
              {texture.type} • {getTextureSizeLabel(texture.size)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="image" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="uv">UV Map</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent
            value="image"
            className="min-h-0 flex-1 space-y-3 overflow-auto"
          >
            <DialogDescription className="text-gray-300">
              Image:
            </DialogDescription>
            <div className="flex justify-center bg-checkered p-4 rounded">
              <img
                src={texture.url}
                alt={texture.name}
                className="max-w-full max-h-[70vh] object-contain border border-gray-600"
              />
            </div>
          </TabsContent>

          <TabsContent
            value="uv"
            className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden"
          >
            <DialogDescription className="text-gray-300">
              UV Map — move, rotate, scale, flip, or fit UV coordinates to the
              texture image.
            </DialogDescription>
            {open && (
              <UvMapEditor
                key={`${texture.name}-${open ? "open" : "closed"}`}
                textureUrl={texture.url}
                textureName={texture.name}
                uvLayout={uvLayout ?? null}
                textureSize={texture.size}
                onPreviewEdit={onPreviewUvEdit}
                onApplyEdit={onApplyUvEdit}
              />
            )}
          </TabsContent>

          <TabsContent
            value="assignments"
            className="min-h-0 flex-1 space-y-3 overflow-auto"
          >
            <DialogDescription className="text-gray-300">
              Material and mesh usage:
            </DialogDescription>
            <UvAssignmentPanel
              textureName={texture.name}
              textureType={texture.type}
              material={texture.material}
              size={texture.size}
              uvLayout={uvLayout ?? null}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-2">
          <div className="flex space-x-2">
            {canReplace && (
              <Button size="sm" variant="outline" onClick={onReplace}>
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
