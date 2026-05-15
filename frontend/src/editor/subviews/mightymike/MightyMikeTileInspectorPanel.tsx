import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { Shield, Info, Paintbrush, Layers } from "lucide-react";
import { MightyMikeResizeMapControls } from "./MightyMikeResizeMapControls";
import {
  getFlagChecked,
  getFlagLabel,
  getTileInfoRows,
  MIGHTY_MIKE_ACTIVE_FLAG_OPTIONS,
  MIGHTY_MIKE_FLAG_OPTIONS,
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
  showCollisionOverlay: boolean;
  onToggleCollisionOverlay: () => void;
  collisionBrushMode: boolean;
  onToggleCollisionBrushMode: () => void;
  paramBrushField: string | null;
  onParamBrushFieldChange: (value: string) => void;
  paramBrushValue: number;
  setParamBrushValue: (value: number) => void;
  showParamsOverlay: boolean;
  onToggleParamsOverlay: () => void;
  paramsOverlayMode: "flagsAny" | "flagBit" | "p0" | "p1";
  onParamsOverlayModeChange: (
    value: "flagsAny" | "flagBit" | "p0" | "p1",
  ) => void;
  paramsOverlayFlagBit: number;
  onParamsOverlayFlagBitChange: (value: number) => void;
  handleUpdateCollisionProperty: (
    property: "hasCollisionMask" | "usePixelAccurateCollision",
    value: boolean,
  ) => void;
  onResize: (
    direction: "top" | "bottom" | "left" | "right",
    tileCount: number,
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
  showCollisionOverlay,
  collisionBrushMode,
  paramBrushField,
  paramBrushValue,
  setParamBrushValue,
  showParamsOverlay,
  onToggleCollisionOverlay,
  onToggleCollisionBrushMode,
  onParamBrushFieldChange,
  onToggleParamsOverlay,
  paramsOverlayMode,
  onParamsOverlayModeChange,
  paramsOverlayFlagBit,
  onParamsOverlayFlagBitChange,
  onResize,
  handleUpdateCollisionProperty,
  handleUpdateTileAttribute,
  getNumber,
}: MightyMikeTileInspectorPanelProps) {
  const clampedOverlayFlagBit = Math.max(0, Math.min(15, paramsOverlayFlagBit));

  const currentOverlayBitLabel = getFlagLabel(clampedOverlayFlagBit);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <MightyMikeResizeMapControls onResize={onResize} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Collision Overlay</span>
        <Button
          size="sm"
          variant={showCollisionOverlay ? "default" : "outline"}
          onClick={onToggleCollisionOverlay}
          title={
            showCollisionOverlay
              ? "Hide collision mask overlay"
              : "Show collision mask overlay"
          }
        >
          <Shield className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Collision Brush</span>
        <Button
          size="sm"
          variant={collisionBrushMode ? "default" : "outline"}
          onClick={onToggleCollisionBrushMode}
          title={
            collisionBrushMode
              ? "Disable collision brush (click tiles to toggle)"
              : "Enable collision brush — drag to toggle collision on tiles"
          }
        >
          <Paintbrush className="w-4 h-4" />
        </Button>
      </div>

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
        <div className="border-t border-gray-600 pt-2 space-y-2">
          <p className="font-bold text-xs">Tile Behavior</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Gameplay Flags</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
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

          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center text-xs">
            {(["p0", "p1"] as const).map((property) => (
              <div key={property} className="contents">
                <label className="text-gray-300">
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
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-gray-600 pt-2">
            <p className="text-xs text-gray-400 mb-1">Paint Tool</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Select
                  value={paramBrushField ?? "none"}
                  onValueChange={onParamBrushFieldChange}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Off" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Off</SelectItem>
                    <SelectItem value="flags">Paint Gameplay Flags</SelectItem>
                    <SelectItem value="p0">Paint Extra Setting A</SelectItem>
                    <SelectItem value="p1">Paint Extra Setting B</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="h-7 text-xs w-16"
                  value={paramBrushValue}
                  onChange={(e) =>
                    setParamBrushValue(parseInputNumber(e.target.value))
                  }
                  disabled={paramBrushField === null}
                />
              </div>

              <div className="rounded border border-gray-700 p-2">
                <p className="mb-1 text-[11px] text-gray-300">Map Highlight</p>
                <Select
                  value={paramsOverlayMode}
                  onValueChange={(value) => {
                    if (
                      value === "flagsAny" ||
                      value === "flagBit" ||
                      value === "p0" ||
                      value === "p1"
                    ) {
                      onParamsOverlayModeChange(value);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select overlay focus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flagsAny">
                      Tiles with any gameplay flag
                    </SelectItem>
                    <SelectItem value="flagBit">
                      Tiles with one chosen flag
                    </SelectItem>
                    <SelectItem value="p0">
                      Tiles with Extra Setting A
                    </SelectItem>
                    <SelectItem value="p1">
                      Tiles with Extra Setting B
                    </SelectItem>
                  </SelectContent>
                </Select>

                {paramsOverlayMode === "flagBit" && (
                  <div className="mt-2 space-y-1">
                    <Select
                      value={String(clampedOverlayFlagBit)}
                      onValueChange={(value) => {
                        const parsed = parseInputNumber(value);
                        onParamsOverlayFlagBitChange(
                          Math.max(0, Math.min(15, parsed)),
                        );
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select a flag" />
                      </SelectTrigger>
                      <SelectContent>
                        {MIGHTY_MIKE_FLAG_OPTIONS.map(([bit, label]) => (
                          <SelectItem key={bit} value={String(bit)}>
                            Bit {bit}: {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-gray-400">
                      Highlighting {currentOverlayBitLabel}
                    </span>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant={showParamsOverlay ? "default" : "outline"}
                className="w-full"
                onClick={onToggleParamsOverlay}
              >
                <Layers className="w-3 h-3 mr-1" />
                {showParamsOverlay
                  ? "Hide Params Overlay"
                  : "Show Params Overlay"}
              </Button>
            </div>
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
    <div className="border-t border-gray-600 pt-2">
      <p className="font-bold text-xs mb-1">Collision</p>
      {collisionProps ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
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
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {collisionProps.hasCollisionMask && (
            <div className="flex items-center justify-between text-xs">
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
                <SelectTrigger className="w-24 h-7 text-xs">
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
