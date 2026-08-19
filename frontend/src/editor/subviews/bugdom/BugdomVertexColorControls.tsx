import { useAtom } from "jotai";
import type { FormEvent } from "react";
import { z } from "zod";
import {
  bugdomVertexColorBrushAtom,
  bugdomVertexColorBrushRadiusAtom,
  bugdomVertexColorDisplayModeAtom,
  editBugdomVertexColorsAtom,
} from "@/data/terrain/bugdomVertexColorAtoms";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const displayModeSchema = z.enum(["none", "in-game", "half", "colors-only"]);
const colorInputSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

function readColorInput(event: FormEvent<HTMLInputElement>): string | null {
  const result = colorInputSchema.safeParse(event.currentTarget.value);
  return result.success ? result.data.toLowerCase() : null;
}

export function BugdomVertexColorControls() {
  const [displayMode, setDisplayMode] = useAtom(
    bugdomVertexColorDisplayModeAtom,
  );
  const [editing, setEditing] = useAtom(editBugdomVertexColorsAtom);
  const [color, setColor] = useAtom(bugdomVertexColorBrushAtom);
  const [radius, setRadius] = useAtom(bugdomVertexColorBrushRadiusAtom);

  return (
    <div className="p-3 text-sm">
      <h3 className="mb-2 font-bold text-white">Terrain vertex colors</h3>
      <div className="flex items-center gap-3">
        <span>Display</span>
        <Select
          value={displayMode}
          onValueChange={(value) => {
            const result = displayModeSchema.safeParse(value);
            if (!result.success) return;
            setDisplayMode(result.data);
            if (result.data === "none") setEditing(false);
          }}
        >
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No color</SelectItem>
            <SelectItem value="in-game">In-game</SelectItem>
            <SelectItem value="half">50% opacity</SelectItem>
            <SelectItem value="colors-only">Colors only</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
          onInput={(event) => {
            const nextColor = readColorInput(event);
            if (nextColor) setColor(nextColor);
          }}
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
    </div>
  );
}
