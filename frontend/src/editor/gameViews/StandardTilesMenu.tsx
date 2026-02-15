/**
 * Standard Tiles Menu
 *
 * For games that use standard supertile-based terrain (Bugdom 2, Nanosaur 2, Cro-Mag, Billy Frontier)
 * Has topology editing and empty tile flags, but no electric floor options
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "../../data/tiles/tileAtoms";
import { useAtom } from "jotai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CanvasView,
  CanvasViewMode,
  Export3DScene,
  Show3DSplines,
  Show3DItems,
  Show3DFences,
  Show3DLiquid,
  Show3DItemModels,
} from "@/data/canvasView/canvasViewAtoms";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

export function StandardTilesMenu({
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
  const [, setExport3DScene] = useAtom(Export3DScene);
  const [show3DSplines, setShow3DSplines] = useAtom(Show3DSplines);
  const [show3DItems, setShow3DItems] = useAtom(Show3DItems);
  const [show3DFences, setShow3DFences] = useAtom(Show3DFences);
  const [show3DLiquid, setShow3DLiquid] = useAtom(Show3DLiquid);
  const [show3DItemModels, setShow3DItemModels] = useAtom(Show3DItemModels);
  const [tileEditingEnabled, setTileEditingEnabled] =
    useAtom(TileEditingEnabled);
  const [selectedTileBrushType, setSelectedTileBrushType] =
    useAtom(TileBrushType);

  const header = headerData?.Hedr?.[1000]?.obj;
  const minY = header?.minY || 0;
  const maxY = header?.maxY || 0;

  useEffect(() => {
    if (tileView !== TileViews.Topology) {
      setCanvasViewMode(CanvasView.TWO_D);
    }
  }, [tileView, setCanvasViewMode]);

  const handleMinYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setHeaderData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.minY = newValue;
      }
    });
  };

  const handleMaxYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) return;

    setHeaderData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.maxY = newValue;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {tileView === TileViews.Topology && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <p>Brush Mode</p>
          <Select
            value={brushMode.toString()}
            onValueChange={(e) => setBrushMode(parseInt(e))}
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
            onValueChange={(e) => setValueMode(parseInt(e))}
          >
            <SelectTrigger>
              {valueMode === TopologyValueMode.SET_VALUE && "Set To Value"}
              {valueMode === TopologyValueMode.DELTA_VALUE && "Adjust By Value"}
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
          <div className="flex flex-row justify-between gap-2 items-center col-span-2">
            <div className="flex items-center gap-2">
              <p>Show 3D Map (View Only)</p>
              <Switch
                checked={canvasViewMode === CanvasView.THREE_D}
                onCheckedChange={(e) =>
                  setCanvasViewMode(e ? CanvasView.THREE_D : CanvasView.TWO_D)
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setExport3DScene((c) => c + 1)}>
                Download 3D (GLB)
              </Button>
            </div>
          </div>
          {canvasViewMode === CanvasView.THREE_D && (
            <>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Splines</p>
                <Switch
                  checked={show3DSplines}
                  onCheckedChange={setShow3DSplines}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Items</p>
                <Switch
                  checked={show3DItems}
                  onCheckedChange={setShow3DItems}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Fences</p>
                <Switch
                  checked={show3DFences}
                  onCheckedChange={setShow3DFences}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show Liquid</p>
                <Switch
                  checked={show3DLiquid}
                  onCheckedChange={setShow3DLiquid}
                />
              </div>
              <div className="flex flex-row justify-center gap-2 items-center col-span-2">
                <p>Show 3D Models</p>
                <Switch
                  checked={show3DItemModels}
                  onCheckedChange={setShow3DItemModels}
                />
              </div>
            </>
          )}
        </div>
      )}

      {tileView === TileViews.Flags && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <div className="flex flex-row justify-center gap-2 items-center col-span-4">
            <p>Enable Tile Editing</p>
            <Switch
              checked={tileEditingEnabled}
              onCheckedChange={(e) => setTileEditingEnabled(e)}
            />
          </div>

          {tileEditingEnabled && (
            <>
              <p>Brush Radius</p>
              <Input
                type="number"
                defaultValue={brushRadius}
                onChange={(e) => setBrushRadius(parseInt(e.target.value) || 0)}
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
            Click on the map to mark tiles as empty (white) or not empty
            (black).
          </p>
        </div>
      )}
    </div>
  );
}
