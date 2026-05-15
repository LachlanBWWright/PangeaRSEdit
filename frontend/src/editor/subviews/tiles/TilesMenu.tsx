import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushMode,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TopologyValueMode,
  TileEditingEnabled,
  TileBrushType,
} from "../../../data/tiles/tileAtoms";
import { useAtom, useAtomValue } from "jotai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CanvasView,
  CanvasViewMode,
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
  Export3DScene,
} from "@/data/canvasView/canvasViewAtoms";

import { Switch } from "@/components/ui/switch";
import { HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { Globals } from "../../../data/globals/globals";
import {
  getNextCanvasViewMode,
  getTabForTileView,
  getTileMenuFlags,
  getTileViewForTab,
  parseFiniteNumber,
  parseIntOrZero,
} from "@/editor/subviews/tiles/tilesMenuState";

export function TilesMenu({
  headerData,
  setHeaderData,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
}) {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);
  const [, setShow3DSplines] = useAtom(Show3DSplines);
  const [, setShow3DItems] = useAtom(Show3DItems);
  const [, setShow3DFences] = useAtom(Show3DFences);
  const [, setShow3DLiquid] = useAtom(Show3DLiquid);
  const [, setExport3DScene] = useAtom(Export3DScene);
  const [tileEditingEnabled, setTileEditingEnabled] =
    useAtom(TileEditingEnabled);
  const [selectedTileBrushType, setSelectedTileBrushType] =
    useAtom(TileBrushType);
  const globals = useAtomValue(Globals);

  const header = headerData?.Hedr?.[1000]?.obj;
  const minY = header?.minY || 0;
  const maxY = header?.maxY || 0;

  // Determine which tile options are available for this game
  const gameType = globals.GAME_TYPE;

  const { hasElectricFloorOptions, hasTileFlags, usesIndividualTiles } =
    getTileMenuFlags(gameType);

  const handleMinYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFiniteNumber(e.target.value);
    if (newValue === null) return;

    setHeaderData((draft) => {
      draft.Hedr[1000].obj.minY = newValue;
    });
  };

  const handleMaxYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFiniteNumber(e.target.value);
    if (newValue === null) return;

    setHeaderData((draft) => {
      draft.Hedr[1000].obj.maxY = newValue;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        value={getTabForTileView(tileView)}
        onValueChange={(v) => {
          const { tileView: nextTileView, forceTwoD } = getTileViewForTab(v);
          setTileView(nextTileView);
          if (forceTwoD) {
            setCanvasViewMode(CanvasView.TWO_D);
          }
        }}
      >
        <TabsList className="grid grid-flow-col auto-cols-fr w-full">
          <TabsTrigger value="topology">Topology</TabsTrigger>
          {hasTileFlags && <TabsTrigger value="flags">Empty Tiles</TabsTrigger>}
          {hasElectricFloorOptions && (
            <>
              <TabsTrigger value="electric0">Electric Floor 1</TabsTrigger>
              <TabsTrigger value="electric1">Electric Floor 2</TabsTrigger>
            </>
          )}
        </TabsList>
      </Tabs>

      {/* Info message for games without tile attribute editing */}
      {usesIndividualTiles && tileView !== TileViews.Topology && (
        <div className="text-sm text-gray-500 p-2 bg-gray-800 rounded">
          <p>Tile flag editing is not available for {globals.GAME_NAME}.</p>
          <p>This game uses individual tiles instead of tile attributes.</p>
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center"></div>

      {tileView === TileViews.Topology && (
        <>
          <div className="text-sm text-blue-400 p-3 bg-blue-950/30 rounded border border-blue-800/50 mb-3">
            <p className="font-semibold mb-1">✨ Topology Editing</p>
            <p>• Hover over the 3D view to see brush radius (green circle)</p>
            <p>
              • Click and drag to paint height changes directly onto terrain
            </p>
            <p>• Changes apply immediately to the heightmap</p>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
            <p>Brush Mode</p>
            <Select
              value={brushMode.toString()}
              onValueChange={(e) => {
                setBrushMode(parseIntOrZero(e));
              }}
            >
              <SelectTrigger>
                {brushMode === TopologyBrushMode.CIRCLE_BRUSH
                  ? "Circle Brush"
                  : "Square Brush"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TopologyBrushMode.CIRCLE_BRUSH.toString()}>
                  Circle Brush
                </SelectItem>
                <SelectItem value={TopologyBrushMode.SQUARE_BRUSH.toString()}>
                  Square Brush
                </SelectItem>
              </SelectContent>
            </Select>

            <p>Adjustment Mode</p>
            <Select
              value={valueMode.toString()}
              onValueChange={(e) => {
                setValueMode(parseIntOrZero(e));
              }}
            >
              <SelectTrigger>
                {valueMode === TopologyValueMode.SET_VALUE && "Set To Value"}
                {valueMode === TopologyValueMode.DELTA_VALUE &&
                  "Adjust By Value"}
                {valueMode === TopologyValueMode.DELTA_WITH_DROPOFF &&
                  "Adjust By Value (With Dropoff)"}
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={TopologyValueMode.SET_VALUE.toString()}>
                  Set To Value
                </SelectItem>
                <SelectItem value={TopologyValueMode.DELTA_VALUE.toString()}>
                  Adjust By Value
                </SelectItem>
                <SelectItem
                  value={TopologyValueMode.DELTA_WITH_DROPOFF.toString()}
                >
                  Adjust By Value (With Dropoff)
                </SelectItem>
              </SelectContent>
            </Select>

            <p>Brush Radius</p>
            <Input
              type="number"
              defaultValue={brushRadius}
              onChange={(e) => setBrushRadius(parseIntOrZero(e.target.value))}
            />
            <p>Height Value</p>
            <Input
              type="number"
              defaultValue={value}
              onChange={(e) => setValue(parseIntOrZero(e.target.value))}
            />

            <p>Min Height</p>
            <Input type="number" value={minY} onChange={handleMinYChange} />
            <p>Max Height</p>
            <Input type="number" value={maxY} onChange={handleMaxYChange} />
            <p>Topology View Opacity</p>
            <Input
              type="number"
              defaultValue={toplogyOpacity}
              onChange={(e) => {
                const nextValue = parseFiniteNumber(e.target.value);
                setTopologyOpacity(nextValue ?? 1);
              }}
            />

            <div className="flex flex-row justify-between gap-2 items-center col-span-2">
              <div className="flex items-center gap-2">
                <p>Show 3D View</p>
                <Switch
                  checked={canvasViewMode === CanvasView.THREE_D}
                  onCheckedChange={(e) => {
                    setCanvasViewMode(getNextCanvasViewMode(e));
                    if (e) {
                      setShow3DSplines(true);
                      setShow3DItems(true);
                      setShow3DFences(true);
                      setShow3DLiquid(true);
                    }
                  }}
                />
              </div>

              {/* Download button lives on the same row as the toggle for discoverability */}
              <div className="flex items-center gap-2">
                <Button onClick={() => setExport3DScene((c) => c + 1)}>
                  Download 3D (GLB)
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {hasTileFlags &&
        (tileView === TileViews.Flags ||
          tileView === TileViews.ElectricFloor0 ||
          tileView === TileViews.ElectricFloor1) && (
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
            <div className="flex flex-row justify-center gap-2 items-center col-span-4">
              <p>Enable Tile Editing</p>
              <Switch
                checked={tileEditingEnabled}
                onCheckedChange={(e) => {
                  setTileEditingEnabled(e);
                }}
              />
            </div>

            {tileEditingEnabled && (
              <>
                <p>Brush Radius</p>
                <Input
                  type="number"
                  defaultValue={brushRadius}
                  onChange={(e) =>
                    setBrushRadius(parseIntOrZero(e.target.value))
                  }
                />
                <p>Brush Type</p>
                <Select
                  value={selectedTileBrushType}
                  onValueChange={(value) => {
                    if (value === "add" || value === "remove") {
                      setSelectedTileBrushType(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    {selectedTileBrushType === "add"
                      ? "Add Flag"
                      : "Remove Flag"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Flag</SelectItem>
                    <SelectItem value="remove">Remove Flag</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <p className="col-span-4 mt-2">
              {tileView === TileViews.Flags &&
                "Click on the map to mark tiles as empty (white) or not empty (black)."}
              {tileView === TileViews.ElectricFloor0 &&
                "Click on the map to mark tiles as Electric Floor 1 (white) or not (black)."}
              {tileView === TileViews.ElectricFloor1 &&
                "Click on the map to mark tiles as Electric Floor 2 (white) or not (black)."}
            </p>
          </div>
        )}
    </div>
  );
}
