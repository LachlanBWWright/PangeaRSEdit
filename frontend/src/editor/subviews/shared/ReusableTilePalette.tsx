import { TileCanvas } from "./TileCanvas";
import { Button } from "@/components/ui/button";

interface ReusableTilePaletteProps {
  readonly images: readonly HTMLCanvasElement[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly thumbnailSize?: number;
  readonly gridClassName?: string;
  readonly itemClassName?: string;
}

export function ReusableTilePalette({
  images,
  selectedIndex,
  onSelect,
  thumbnailSize = 32,
  gridClassName = "grid-cols-[repeat(auto-fill,minmax(40px,1fr))]",
  itemClassName = "justify-center",
}: ReusableTilePaletteProps) {
  return (
    <div className={`grid gap-1 p-1 ${gridClassName}`}>
      {images.map((image, index) => (
        <Button
          key={index}
          type="button"
          variant="selectable"
          className={`aspect-square h-auto w-full min-w-0 overflow-hidden p-0 ${itemClassName}`}
          title={`Tile #${index}`}
          aria-label={`Select tile ${index}`}
          aria-pressed={selectedIndex === index}
          onClick={() => onSelect(index)}
        >
          <TileCanvas image={image} size={thumbnailSize} />
        </Button>
      ))}
    </div>
  );
}
