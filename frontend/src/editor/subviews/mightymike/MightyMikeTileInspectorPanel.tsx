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
import {
  getFlagChecked,
  getTileInfoRows,
  MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS,
  MIGHTY_MIKE_UNUSED_FLAG_OPTIONS,
  parseInputNumber,
  toggleFlagBit,
} from "./mightyMikeTileInspectorState";

export type CollisionProperties = {
  hasCollisionMask: boolean;
  usePixelAccurateCollision: boolean;
} | null;

interface MightyMikeTileInspectorPanelProps {
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
  return (
    <div className="flex flex-col gap-3 text-sm">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer w-fit">
              <Info className="w-3 h-3" />
              Tile Info
            </button>
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

      {mightyMikeTileValuesArrayLength > 0 ? (
        <CollisionPropertiesSection
          collisionProps={collisionProps}
          onUpdateCollisionProperty={handleUpdateCollisionProperty}
        />
      ) : null}

      {currentTileAttributes && (
        <div className="space-y-3 border-t border-gray-600 pt-3">
          <p className="font-bold text-xs">Tile Behavior</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Gameplay Flags</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 xl:grid-cols-3 2xl:grid-cols-4">
              {MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS.map(([bit, label]) => {
                const checked = getFlagChecked(
                  getNumber(currentTileAttributes["flags"]),
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

            {MIGHTY_MIKE_UNUSED_FLAG_OPTIONS.length > 0 && (
              <details className="mt-2 rounded border border-gray-700 px-2 py-1">
                <summary className="cursor-pointer text-[11px] text-gray-400">
                  Advanced: Reserved Flags
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  {MIGHTY_MIKE_UNUSED_FLAG_OPTIONS.map(([bit, label]) => {
                    const checked = getFlagChecked(
                      getNumber(currentTileAttributes["flags"]),
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
                            const next = toggleFlagBit(
                              current,
                              bit,
                              val === true,
                            );
                            handleUpdateTileAttribute("flags", next);
                          }}
                          className="h-3 w-3"
                        />
                        <span title={`Bit ${bit}`}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            {(["p0", "p1"] as const).map((property) => (
              <div
                key={property}
                className="grid grid-cols-[auto_1fr] items-center gap-2"
              >
                <label className="text-gray-300 whitespace-nowrap">
                  {property === "p0" ? "Extra Setting A" : "Extra Setting B"}
                </label>
                <Input
                  type="number"
                  value={getNumber(currentTileAttributes[property]).toString()}
                  onChange={(e) =>
                    handleUpdateTileAttribute(
                      property,
                      parseInputNumber(e.target.value),
                    )
                  }
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
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
      <p className="mb-2 font-bold text-xs">Collision</p>
      {collisionProps ? (
        <div className="grid gap-2 text-xs md:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">Mask:</span>
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
              <span>Type:</span>
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
                  <SelectItem value="pixel">Pixel-Accurate</SelectItem>
                  <SelectItem value="tile">Tile-Based</SelectItem>
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
