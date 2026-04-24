import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Info, Paintbrush, Layers } from "lucide-react";
import { MightyMikeResizeMapControls } from "./MightyMikeResizeMapControls";

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
  onResize,
  handleUpdateCollisionProperty,
  handleUpdateTileAttribute,
  getNumber,
}: MightyMikeTileInspectorPanelProps) {
  return (
    <div className="flex flex-col gap-2 text-sm overflow-y-auto">
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
            <p>
              Map: {mapWidth} × {mapHeight}
            </p>
            <p>Total: {totalTiles}</p>
            <p>Images: {mapImagesLength}</p>
            <p>Pos: {effectiveSelectedTile}</p>
            <p>
              Logical:{" "}
              {effectiveSelectedTile < layr.length
                ? layr[effectiveSelectedTile]
                : "N/A"}
            </p>
            <p>Physical: {currentImageIndex ?? "N/A"}</p>
            <p>Xlat: {xlatTable ? "Yes" : "No"}</p>
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
          <p className="font-bold text-xs">Tile Parameters</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Flags</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {([
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
              ] as [number, string][]).map(([bit, label]) => {
                const mask = 1 << bit;
                const checked =
                  (getNumber(currentTileAttributes["flags"]) & mask) !== 0;
                return (
                  <label
                    key={bit}
                    className="flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const current = getNumber(currentTileAttributes["flags"]);
                        const next = val ? current | mask : current & ~mask;
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

          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center text-xs">
            {(["p0", "p1"] as const).map((property) => (
              <div key={property} className="contents">
                <label className="text-gray-300">Parameter {property[1]}</label>
                <Input
                  type="number"
                  value={getNumber(currentTileAttributes[property]).toString()}
                  onChange={(e) =>
                    handleUpdateTileAttribute(
                      property,
                      Number.parseInt(e.target.value || "0", 10) || 0,
                    )
                  }
                  className="h-7 text-xs"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-gray-600 pt-2">
            <p className="text-xs text-gray-400 mb-1">Param Brush</p>
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
                    <SelectItem value="flags">Flags</SelectItem>
                    <SelectItem value="p0">Parameter 0</SelectItem>
                    <SelectItem value="p1">Parameter 1</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="h-7 text-xs w-16"
                  value={paramBrushValue}
                  onChange={(e) =>
                    setParamBrushValue(
                      Number.parseInt(e.target.value || "0", 10) || 0,
                    )
                  }
                  disabled={paramBrushField === null}
                />
              </div>
              <Button
                size="sm"
                variant={showParamsOverlay ? "default" : "outline"}
                className="w-full"
                onClick={onToggleParamsOverlay}
              >
                <Layers className="w-3 h-3 mr-1" />
                {showParamsOverlay ? "Hide Params Overlay" : "Show Params Overlay"}
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
