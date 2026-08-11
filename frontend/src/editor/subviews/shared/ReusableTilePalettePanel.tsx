import type { ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Upload } from "lucide-react";
import { ReusableTilePalette } from "./ReusableTilePalette";

interface ReusableTilePalettePanelProps {
  readonly images: HTMLCanvasElement[];
  readonly selectedIndex: number;
  readonly selectedImageInUse: boolean;
  readonly uploadInputRef: RefObject<HTMLInputElement | null>;
  readonly onEdit: () => void;
  readonly onUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly onAdd: () => void;
  readonly onRemove: () => void;
  readonly onReplace: () => void;
  readonly onSelect: (index: number) => void;
  readonly title?: string;
  readonly itemLabel?: string;
  readonly replaceLabel?: string;
  readonly thumbnailSize?: number;
  readonly gridClassName?: string;
  readonly itemClassName?: string;
  readonly summary?: string;
}

export function ReusableTilePalettePanel({
  images,
  selectedIndex,
  selectedImageInUse,
  uploadInputRef,
  onEdit,
  onUpload,
  onAdd,
  onRemove,
  onReplace,
  onSelect,
  title = "Tile Palette",
  itemLabel = "palette tile",
  replaceLabel = "Replace with Palette #",
  thumbnailSize = 28,
  gridClassName,
  itemClassName,
  summary,
}: ReusableTilePalettePanelProps) {
  const hasSelection = selectedIndex >= 0 && selectedIndex < images.length;
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <p className="text-center font-bold text-sm">{title}</p>
      {summary ? (
        <p className="text-center text-xs text-gray-400">{summary}</p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-600">
        <ReusableTilePalette
          images={images}
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          thumbnailSize={thumbnailSize}
          gridClassName={gridClassName}
          itemClassName={itemClassName}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5 flex-none">
        <Button size="sm" variant="outline" onClick={onEdit} disabled={!hasSelection}>
          <Edit className="mr-1 h-4 w-4" /> Edit {itemLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => uploadInputRef.current?.click()}
          disabled={!hasSelection}
        >
          <Upload className="mr-1 h-4 w-4" /> Replace selected {itemLabel}
        </Button>
        <input
          ref={uploadInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={onUpload}
        />
        <Button size="sm" variant="outline" onClick={onAdd}>Add {itemLabel}</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          disabled={selectedImageInUse || images.length <= 1}
        >
          Remove {itemLabel}
        </Button>
      </div>
      <Button size="sm" onClick={onReplace} disabled={!hasSelection}>
        <Upload className="mr-1 h-4 w-4" /> {replaceLabel}{selectedIndex}
      </Button>
    </div>
  );
}
