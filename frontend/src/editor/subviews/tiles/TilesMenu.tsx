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

export function TilesMenu() {
  const [tileView, setTileView] = useAtom(TileViewMode);
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  const [toplogyOpacity, setTopologyOpacity] = useAtom(TopologyOpacity);
  //data.YCrd[1000].obj[0]
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
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-2">
          <p>Brush Mode</p>
          <select
            className="text-black"
            value={brushMode}
            onChange={(e) => {
              setBrushMode(parseInt(e.target.value));
            }}
          >
            <option value={TopologyBrushMode.CIRCLE_BRUSH}>Circle Brush</option>
            <option value={TopologyBrushMode.SQUARE_BRUSH}>Square Brush</option>
          </select>
          <p>Adjustment Mode</p>
          <select
            className="text-black"
            value={valueMode}
            onChange={(e) => {
              setValueMode(parseInt(e.target.value));
            }}
          >
            <option value={TopologyValueMode.SET_VALUE}>Set Value</option>
            <option value={TopologyValueMode.DELTA_VALUE}>Delta Value</option>
          </select>
          <p>Brush Radius</p>
          <input
            type="number"
            className="text-black"
            defaultValue={brushRadius}
            onChange={(e) => setBrushRadius(parseInt(e.target.value) || 0)}
          />
          <p>Height Value</p>
          <input
            type="number"
            className="text-black"
            defaultValue={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          />
          <p>Topology View Opacity</p>
          <input
            type="number"
            className="text-black"
            defaultValue={toplogyOpacity}
            onChange={(e) =>
              setTopologyOpacity(parseFloat(e.target.value) || 1)
            }
          />
        </div>
      )}
    </div>
  );
}
