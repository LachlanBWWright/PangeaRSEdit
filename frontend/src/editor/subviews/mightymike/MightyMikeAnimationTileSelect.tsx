import { TileCanvas } from "@/editor/subviews/shared/TileCanvas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useState } from "react";

function TileOption({
  index,
  images,
  imageIndexes,
}: {
  readonly index: number;
  readonly images: readonly HTMLCanvasElement[];
  readonly imageIndexes: readonly number[];
}) {
  const imageIndex = imageIndexes[index] ?? index;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="overflow-hidden rounded border border-gray-600 bg-black">
        <TileCanvas image={images[imageIndex]} size={28} />
      </span>
      <span className="truncate">Tile {index}</span>
    </div>
  );
}

export function MightyMikeAnimationTileSelect({
  value,
  images,
  imageIndexes,
  onChange,
}: {
  readonly value: number;
  readonly images: readonly HTMLCanvasElement[];
  readonly imageIndexes: readonly number[];
  readonly onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={value.toString()}
      onValueChange={(next) => {
        const parsed = Number.parseInt(next, 10);
        if (Number.isInteger(parsed)) onChange(parsed);
      }}
    >
      <SelectTrigger className="h-9 py-1">
        <TileOption index={value} images={images} imageIndexes={imageIndexes} />
      </SelectTrigger>
      <SelectContent>
        {open && imageIndexes.map((_imageIndex, index) => (
          <SelectItem key={index} value={index.toString()}>
            <TileOption index={index} images={images} imageIndexes={imageIndexes} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getPaletteColor(palette: Uint8Array, index: number): string {
  const offset = index * 4;
  return `rgb(${palette[offset] ?? 0} ${palette[offset + 1] ?? 0} ${palette[offset + 2] ?? 0})`;
}

function PaletteOption({
  index,
  palette,
}: {
  readonly index: number;
  readonly palette: Uint8Array;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="relative h-5 w-5 overflow-hidden rounded border border-gray-500 bg-[repeating-conic-gradient(#777_0_25%,#333_0_50%)] bg-[length:8px_8px]"
      >
        <span
          className="absolute inset-0 opacity-70"
          style={{ backgroundColor: getPaletteColor(palette, index) }}
        />
        <span className="absolute inset-0 flex items-center justify-center font-bold text-white drop-shadow">×</span>
      </span>
      <span className="truncate">Color {index}</span>
    </div>
  );
}

export function MightyMikePaletteIndexSelect({
  value,
  palette,
  onChange,
}: {
  readonly value: number;
  readonly palette: Uint8Array;
  readonly onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      value={value.toString()}
      onValueChange={(next) => {
        const parsed = Number.parseInt(next, 10);
        if (Number.isInteger(parsed)) onChange(parsed);
      }}
    >
      <SelectTrigger className="h-8 py-1">
        <PaletteOption index={value} palette={palette} />
      </SelectTrigger>
      <SelectContent>
        {open && Array.from({ length: 256 }, (_entry, index) => (
          <SelectItem key={index} value={index.toString()}>
            <PaletteOption index={index} palette={palette} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
