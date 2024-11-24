import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TopologyBrushMode,
  TopologyBrushRadius,
  TopologyValue,
  TopologyValueMode,
} from "../../../data/topology/topologyAtoms";
import { useAtom } from "jotai";

export function TopologyMenu() {
  const [brushMode, setBrushMode] = useAtom(CurrentTopologyBrushMode);
  const [valueMode, setValueMode] = useAtom(CurrentTopologyValueMode);
  const [brushRadius, setBrushRadius] = useAtom(TopologyBrushRadius);
  const [value, setValue] = useAtom(TopologyValue);
  //data.YCrd[1000].obj[0]
  return (
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
        value={brushRadius}
        onChange={(e) => setBrushRadius(parseInt(e.target.value))}
      />
      <p>Height Value</p>
      <input
        type="number"
        className="text-black"
        value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
      />
    </div>
  );
}
