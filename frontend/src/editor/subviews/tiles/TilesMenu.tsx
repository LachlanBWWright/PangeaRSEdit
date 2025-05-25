import { Input } from "@/components/ui/input";
import { Button } from "../../../components/Button";
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
  TILE_ATTRIB_BLANK,
  TILE_ATTRIB_ELECTROCUTE_AREA0,
  TILE_ATTRIB_ELECTROCUTE_AREA1,
} from "../../../data/tiles/tileAtoms";
import { useAtom } from "jotai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";
import { Globals } from "@/data/globals/globals";
import { useAtomValue } from "jotai";

export function TilesMenu({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);
  const [tileEditingEnabled, setTileEditingEnabled] =
    useAtom(TileEditingEnabled);
  const [selectedTileBrushType, setSelectedTileBrushType] =
    useAtom(TileBrushType);
  const globals = useAtomValue(Globals);

  const header = data?.Hedr?.[1000]?.obj;
  const minY = header?.minY || 0;
  const maxY = header?.maxY || 0;

  useEffect(() => {
    if (tileView !== TileViews.Topology) {
      setCanvasViewMode(CanvasView.TWO_D);
    }
  }, [tileView]);

  const handleMinYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setData((draft) => {
      draft.Hedr[1000].obj.minY = newValue;
    });
  };

  const handleMaxYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setData((draft) => {
      draft.Hedr[1000].obj.maxY = newValue;
    });
  };

  // We don't need to define handleTileClick here anymore,
  // as it's been moved to the tileHandlers.ts file

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        <Button
          selected={tileView === TileViews.Topology}
          onClick={() => setTileView(TileViews.Topology)}
        >
          Topology
        </Button>
        <Button
          selected={tileView === TileViews.Flags}
          onClick={() => setTileView(TileViews.Flags)}
        >
          Empty Tiles
        </Button>
        <Button
          selected={tileView === TileViews.ElectricFloor0}
          onClick={() => setTileView(TileViews.ElectricFloor0)}
        >
          Electric Floor 1
        </Button>
        <Button
          selected={tileView === TileViews.ElectricFloor1}
          onClick={() => setTileView(TileViews.ElectricFloor1)}
        >
          Electric Floor 2
        </Button>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center"></div>

      {tileView === TileViews.Topology && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <p>Brush Mode</p>
          <Select
            value={brushMode.toString()}
            onValueChange={(e) => {
              setBrushMode(parseInt(e));
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
              setValueMode(parseInt(e));
            }}
          >
            <SelectTrigger>
              {valueMode === TopologyValueMode.SET_VALUE && "Set Value"}
              {valueMode === TopologyValueMode.DELTA_VALUE && "Delta Value"}
              {valueMode === TopologyValueMode.DELTA_WITH_DROPOFF &&
                "Delta with Dropoff"}
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={TopologyValueMode.SET_VALUE.toString()}>
                Set Value
              </SelectItem>
              <SelectItem value={TopologyValueMode.DELTA_VALUE.toString()}>
                Delta Value
              </SelectItem>
              <SelectItem
                value={TopologyValueMode.DELTA_WITH_DROPOFF.toString()}
              >
                Delta with Dropoff
              </SelectItem>
            </SelectContent>
          </Select>

          <p>Brush Radius</p>
          <Input
            type="number"
            defaultValue={brushRadius}
            onChange={(e) => setBrushRadius(parseInt(e.target.value) || 0)}
          />
          <p>Height Value</p>
          <Input
            type="number"
            defaultValue={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          />

          <p>Min Height</p>
          <Input type="number" value={minY} onChange={handleMinYChange} />
          <p>Max Height</p>
          <Input type="number" value={maxY} onChange={handleMaxYChange} />
          <p>Topology View Opacity</p>
          <Input
            type="number"
            defaultValue={toplogyOpacity}
            onChange={(e) =>
              setTopologyOpacity(parseFloat(e.target.value) || 1)
            }
          />
          <div className="flex flex-row justify-center gap-2 items-center col-span-2">
            <p>Show 3D Map (View Only)</p>
            <Switch
              checked={canvasViewMode === CanvasView.THREE_D}
              onCheckedChange={(e) => {
                setCanvasViewMode(e ? CanvasView.THREE_D : CanvasView.TWO_D);
              }}
            />
          </div>
        </div>
      )}

      {(tileView === TileViews.Flags ||
        tileView === TileViews.ElectricFloor0 ||
        tileView === TileViews.ElectricFloor1) && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <div className="flex flex-row justify-center gap-2 items-center col-span-2">
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
                  {selectedTileBrushType === "add" ? "Add Flag" : "Remove Flag"}
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
