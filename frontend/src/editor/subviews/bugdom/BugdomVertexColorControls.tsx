import { useAtom } from "jotai";
import { z } from "zod";
import {
  bugdomVertexColorBrushAtom,
  bugdomVertexColorBrushRadiusAtom,
  bugdomVertexColorDisplayModeAtom,
  editBugdomVertexColorsAtom,
} from "@/data/terrain/bugdomVertexColorAtoms";
import { Switch } from "@/components/ui/switch";

const displayModeSchema = z.enum(["none", "in-game", "half", "colors-only"]);

export function BugdomVertexColorControls() {
  const [displayMode, setDisplayMode] = useAtom(
    bugdomVertexColorDisplayModeAtom,
  );
  const [editing, setEditing] = useAtom(editBugdomVertexColorsAtom);
  const [color, setColor] = useAtom(bugdomVertexColorBrushAtom);
  const [radius, setRadius] = useAtom(bugdomVertexColorBrushRadiusAtom);

  return (
    <div className="rounded border border-gray-600 p-3 text-sm">
      <h3 className="mb-2 font-bold text-white">Terrain vertex colors</h3>
      <label className="flex items-center gap-3">
        <span>Display</span>
        <select
          className="min-w-0 flex-1 rounded bg-gray-800 px-2 py-1"
          value={displayMode}
          onChange={(event) => {
            const result = displayModeSchema.safeParse(event.currentTarget.value);
            if (!result.success) return;
            setDisplayMode(result.data);
            if (result.data === "none") setEditing(false);
          }}
        >
          <option value="none">No color</option>
          <option value="in-game">In-game</option>
          <option value="half">50% opacity</option>
          <option value="colors-only">Colors only</option>
        </select>
      </label>
      <label className="mt-2 flex items-center justify-between gap-3">
        <span>Paint colors</span>
        <Switch
          checked={editing}
          disabled={displayMode === "none"}
          onCheckedChange={setEditing}
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="bugdom-vcol-color">Brush</label>
        <input
          id="bugdom-vcol-color"
          type="color"
          value={color}
          disabled={!editing}
          onChange={(event) => setColor(event.currentTarget.value)}
        />
        <label htmlFor="bugdom-vcol-radius">Radius</label>
        <input
          id="bugdom-vcol-radius"
          className="w-16 rounded bg-gray-800 px-2 py-1"
          type="number"
          min={0}
          max={12}
          value={radius}
          disabled={!editing}
          onChange={(event) => setRadius(Math.max(0, Number(event.currentTarget.value)))}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Paints the RGB565 colors stored at terrain vertices.
      </p>
    </div>
  );
}
