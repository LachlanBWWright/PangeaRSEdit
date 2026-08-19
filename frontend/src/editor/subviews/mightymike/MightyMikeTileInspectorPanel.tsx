import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFlagChecked,
  getTileInfoRows,
  MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS,
  parseInputNumber,
  toggleFlagBit,
} from "./mightyMikeTileInspectorState";
import { MIGHTY_MIKE_TRACK_SEGMENTS } from "./mightyMikeTrackSegments";

export type CollisionProperties = {
  hasCollisionMask: boolean;
  usePixelAccurateCollision: boolean;
} | null;

interface MightyMikeTileInspectorPanelProps {
  showCellMask: boolean;
  showTileBehavior: boolean;
  mapWidth: number;
  mapHeight: number;
  totalTiles: number;
  mapImagesLength: number;
  effectiveSelectedTile: number;
  layr: number[];
  currentImageIndex: number | null;
  xlatTable: unknown[] | undefined;
  collisionProps: CollisionProperties;
  mightyMikeTileValuesArrayLength: number;
  currentTileAttributes: Record<string, unknown> | null;
  handleUpdateCollisionProperty: (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean,
  ) => void;
  handleUpdateTileAttribute: (
    property: "flags" | "p0" | "p1" | "p2" | "p3" | "p4",
    value: number,
  ) => void;
  getNumber: (value: unknown, defaultValue?: number) => number;
}

export function MightyMikeTileInspectorPanel({
  showCellMask,
  showTileBehavior,
  mapWidth,
  mapHeight,
  totalTiles,
  mapImagesLength,
  effectiveSelectedTile,
  layr,
  currentImageIndex,
  xlatTable,
  collisionProps,
  mightyMikeTileValuesArrayLength,
  currentTileAttributes,
  handleUpdateCollisionProperty,
  handleUpdateTileAttribute,
  getNumber,
}: MightyMikeTileInspectorPanelProps) {
  const gameplayFlags = currentTileAttributes
    ? getNumber(currentTileAttributes["flags"])
    : 0;
  const hasWind = getFlagChecked(gameplayFlags, 8);
  const hasTrack = getFlagChecked(gameplayFlags, 15);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-1 text-gray-400">
              <Info className="w-3 h-3" />
              Tile Info
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs space-y-0.5 max-w-48">
            {getTileInfoRows({
              mapWidth,
              mapHeight,
              totalTiles,
              mapImagesLength,
              effectiveSelectedTile,
              layr,
              currentImageIndex,
              hasXlatTable: Boolean(xlatTable),
            }).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showCellMask && mightyMikeTileValuesArrayLength > 0 ? (
        <CollisionPropertiesSection
          collisionProps={collisionProps}
          onUpdateCollisionProperty={handleUpdateCollisionProperty}
        />
      ) : null}

      {showTileBehavior && currentTileAttributes && (
        <div className="space-y-3 border-t border-gray-600 pt-3">
          <p className="font-bold text-xs">Tile Behavior</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Gameplay Flags</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
              {MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS.map(([bit, label]) => {
                const checked = getFlagChecked(
                  gameplayFlags,
                  bit,
                );
                return (
                  <label
                    key={bit}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const current = getNumber(
                          currentTileAttributes["flags"],
                        );
                        const next = toggleFlagBit(current, bit, val === true);
                        handleUpdateTileAttribute("flags", next);
                      }}
                      className="h-3 w-3"
                    />
                    <span title={`Bit ${bit}`}>{label}</span>
                  </label>
                );
              })}
            </div>

          </div>

          {hasWind ? (
            <div className="grid grid-cols-[88px_1fr] items-center gap-2 text-xs">
              <label className="text-gray-300">Wind direction</label>
              <Select
                value={String(getNumber(currentTileAttributes["p0"]))}
                onValueChange={(value) =>
                  handleUpdateTileAttribute("p0", parseInputNumber(value))
                }
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    "Up",
                    "Up Right",
                    "Right",
                    "Down Right",
                    "Down",
                    "Down Left",
                    "Left",
                    "Up Left",
                  ].map((label, index) => (
                    <SelectItem key={label} value={String(index)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-gray-300">Wind force</label>
              <Input
                type="number"
                min={0}
                max={255}
                value={getNumber(currentTileAttributes["p1"]).toString()}
                onChange={(event) =>
                  handleUpdateTileAttribute("p1", parseInputNumber(event.target.value))
                }
                className="h-8 text-xs"
              />
            </div>
          ) : null}

          {hasTrack ? (
            <div className="space-y-2 rounded border border-gray-700 p-2 text-xs">
              <div>
                <p className="font-medium text-gray-200">Race-car path</p>
                <p className="text-[11px] text-gray-400">
                  Used in Bargain Basement. Race cars follow this curve across
                  the tile and continue through its two indicated edges.
                </p>
              </div>
              <div className="grid grid-cols-[72px_1fr] items-center gap-2">
                <label className="text-gray-300">Path shape</label>
                <Select
                  value={String(getNumber(currentTileAttributes["p0"]))}
                  onValueChange={(value) =>
                    handleUpdateTileAttribute("p0", parseInputNumber(value))
                  }
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MIGHTY_MIKE_TRACK_SEGMENTS.map((segment) => (
                      <SelectItem key={segment.value} value={String(segment.value)}>
                        {segment.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CollisionPropertiesSection({
  collisionProps,
  onUpdateCollisionProperty,
}: {
  collisionProps: CollisionProperties;
  onUpdateCollisionProperty: (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean,
  ) => void;
}) {
  return (
    <div className="border-t border-gray-600 pt-3">
      <p className="mb-1 font-bold text-xs">Cell Rendering Mask</p>
      <p className="mb-2 text-[11px] text-gray-400">
        Controls whether sprites pass behind this map cell. Gameplay collision
        comes from the tile definition's solid-side flags.
      </p>
      {collisionProps ? (
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">Mask</span>
            <Select
              value={collisionProps.hasCollisionMask ? "enabled" : "disabled"}
              onValueChange={(value) =>
                onUpdateCollisionProperty(
                  "hasCollisionMask",
                  value === "enabled",
                )
              }
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {collisionProps.hasCollisionMask && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>Coverage</span>
              <Select
                value={
                  collisionProps.usePixelAccurateCollision ? "pixel" : "tile"
                }
                onValueChange={(value) =>
                  onUpdateCollisionProperty(
                    "usePixelAccurateCollision",
                    value === "pixel",
                  )
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pixel">Opaque Pixels</SelectItem>
                  <SelectItem value="tile">Whole Tile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-xs">No collision data</p>
      )}
    </div>
  );
}
