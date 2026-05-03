export const MIGHTY_MIKE_FLAG_OPTIONS: readonly (readonly [number, string])[] =
  [
    [0, "Solid Top"],
    [1, "Solid Bottom"],
    [2, "Solid Left"],
    [3, "Solid Right"],
    [4, "Death"],
    [5, "Hurt"],
    [6, "(unused)"],
    [7, "Water"],
    [8, "Wind"],
    [9, "Bullets Pass Through"],
    [10, "Stairs"],
    [11, "Friction"],
    [12, "Ice"],
    [13, "(unused)"],
    [14, "(unused)"],
    [15, "Track"],
  ];

export function getMask(bit: number): number {
  return 1 << bit;
}

export function getFlagChecked(flags: number, bit: number): boolean {
  return (flags & getMask(bit)) !== 0;
}

export function toggleFlagBit(
  flags: number,
  bit: number,
  enabled: boolean,
): number {
  const mask = getMask(bit);
  return enabled ? flags | mask : flags & ~mask;
}

export function parseInputNumber(value: string): number {
  return Number.parseInt(value || "0", 10) || 0;
}

export function getTileInfoRows(args: {
  mapWidth: number;
  mapHeight: number;
  totalTiles: number;
  mapImagesLength: number;
  effectiveSelectedTile: number;
  layr: number[];
  currentImageIndex: number | null;
  hasXlatTable: boolean;
}): string[] {
  const logical =
    args.effectiveSelectedTile < args.layr.length
      ? String(args.layr[args.effectiveSelectedTile])
      : "N/A";

  return [
    `Map: ${args.mapWidth} x ${args.mapHeight}`,
    `Total: ${args.totalTiles}`,
    `Images: ${args.mapImagesLength}`,
    `Pos: ${args.effectiveSelectedTile}`,
    `Logical: ${logical}`,
    `Physical: ${args.currentImageIndex ?? "N/A"}`,
    `Xlat: ${args.hasXlatTable ? "Yes" : "No"}`,
  ];
}
