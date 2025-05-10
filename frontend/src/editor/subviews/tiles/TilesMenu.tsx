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

export function TilesMenu() {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  const [canvasViewMode, setCanvasViewMode] = useAtom(CanvasViewMode);

  useEffect(() => {
    if (tileView !== TileViews.Topology) {
      setCanvasViewMode(CanvasView.TWO_D);
    }
  }, [tileView]);

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
    </div>
  );
}
