/**
 * Individual Tiles Menu
 * 
 * For games that use individual 32x32 tiles (Bugdom 1, Nanosaur 1)
 * Only has topology editing - no tile attribute flags
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
import { HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

export function IndividualTilesMenu({
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
      <div className="grid grid-cols-1 gap-2">
        <Button
          selected={tileView === TileViews.Topology}
          onClick={() => setTileView(TileViews.Topology)}
        >
          Topology
        </Button>
      </div>

      <div className="text-sm text-gray-500 p-2 bg-gray-800 rounded">
        <p>This game uses individual 32x32 tiles.</p>
        <p>Tile attributes are edited through the Supertiles menu.</p>
      </div>

      {tileView === TileViews.Topology && (
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center">
          <p>Brush Mode</p>
          <Select
            value={brushMode.toString()}
            onValueChange={(e) => setBrushMode(parseInt(e))}
          >
            <SelectTrigger>
              {brushMode === TopologyBrushMode.CIRCLE_BRUSH ? "Circle Brush" : "Square Brush"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TopologyBrushMode.CIRCLE_BRUSH.toString()}>Circle Brush</SelectItem>
              <SelectItem value={TopologyBrushMode.SQUARE_BRUSH.toString()}>Square Brush</SelectItem>
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
              {valueMode === TopologyValueMode.DELTA_WITH_DROPOFF && "Adjust By Value (With Dropoff)"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TopologyValueMode.SET_VALUE.toString()}>Set To Value</SelectItem>
              <SelectItem value={TopologyValueMode.DELTA_VALUE.toString()}>Adjust By Value</SelectItem>
              <SelectItem value={TopologyValueMode.DELTA_WITH_DROPOFF.toString()}>
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
            onChange={(e) => setTopologyOpacity(parseFloat(e.target.value) || 1)}
          />
          <div className="flex flex-row justify-center gap-2 items-center col-span-2">
            <p>Show 3D Map (View Only)</p>
            <Switch
              checked={canvasViewMode === CanvasView.THREE_D}
              onCheckedChange={(e) => setCanvasViewMode(e ? CanvasView.THREE_D : CanvasView.TWO_D)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
