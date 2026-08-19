import { useState } from "react";
import { TileCanvas } from "@/editor/subviews/shared/TileCanvas";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { MightyMikeTileAnimation } from "@/schemas/common";

function AnimationOption({
  animation,
  index,
  images,
  imageIndexes,
}: {
  readonly animation: MightyMikeTileAnimation;
  readonly index: number;
  readonly images: readonly HTMLCanvasElement[];
  readonly imageIndexes: readonly number[];
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex overflow-hidden rounded border border-gray-600 bg-black">
        {animation.tileNums.slice(0, 3).map((tile, frame) => {
          const imageIndex = imageIndexes[tile];
          return <TileCanvas key={frame} image={imageIndex === undefined ? undefined : images[imageIndex]} size={24} />;
        })}
      </div>
      <span className="truncate">{animation.name || `Animation ${index + 1}`}</span>
    </div>
  );
}

export function MightyMikeAnimationSelect({
  animations,
  value,
  images,
  imageIndexes,
  onChange,
}: {
  readonly animations: readonly MightyMikeTileAnimation[];
  readonly value: number;
  readonly images: readonly HTMLCanvasElement[];
  readonly imageIndexes: readonly number[];
  readonly onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = animations[value];
  return (
    <Select open={open} onOpenChange={setOpen} value={selected ? value.toString() : ""} onValueChange={(next) => {
      const parsed = Number.parseInt(next, 10);
      if (Number.isInteger(parsed)) onChange(parsed);
    }}>
      <SelectTrigger>
        {selected ? <AnimationOption animation={selected} index={value} images={images} imageIndexes={imageIndexes} /> : <span>Select animation</span>}
      </SelectTrigger>
      <SelectContent>
        {open && animations.map((animation, index) => (
          <SelectItem key={index} value={index.toString()}>
            <AnimationOption animation={animation} index={index} images={images} imageIndexes={imageIndexes} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
