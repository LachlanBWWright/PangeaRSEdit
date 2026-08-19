import { useAtom } from "jotai";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SelectedSemanticTileAttribute,
  TileBrushType,
  TileEditingEnabled,
  TileAttributeOverlayOpacity,
  TileViewMode,
  TileViews,
} from "@/data/tiles/tileAtoms";
import type { SemanticTileAttribute } from "@/data/terrain/semanticTileAttributes";

interface SemanticTileAttributeControlsProps {
  readonly attributes: readonly SemanticTileAttribute[];
}

export function SemanticTileAttributeControls({
  attributes,
}: SemanticTileAttributeControlsProps) {
  const [selected, setSelected] = useAtom(SelectedSemanticTileAttribute);
  const [editing, setEditing] = useAtom(TileEditingEnabled);
  const [brushType, setBrushType] = useAtom(TileBrushType);
  const [, setTileView] = useAtom(TileViewMode);
  const [overlayOpacity, setOverlayOpacity] = useAtom(
    TileAttributeOverlayOpacity,
  );

  if (attributes.length === 0) return null;

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 rounded border border-gray-700 p-2">
      <p>Surface property</p>
      <Select value={selected ?? ""} onValueChange={(value) => {
        setSelected(value);
        setTileView(TileViews.Attributes);
      }}>
        <SelectTrigger><SelectValue placeholder="Choose a property" /></SelectTrigger>
        <SelectContent>
          {attributes.map((attribute) => (
            <SelectItem key={attribute.id} value={attribute.id}>{attribute.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p>Paint attributes</p>
      <Switch checked={editing} onCheckedChange={setEditing} />
      <p>Brush action</p>
      <Select value={brushType} onValueChange={(value) => {
        if (value === "add" || value === "remove") setBrushType(value);
      }}>
        <SelectTrigger>{brushType === "add" ? "Apply property" : "Remove property"}</SelectTrigger>
        <SelectContent>
          <SelectItem value="add">Apply property</SelectItem>
          <SelectItem value="remove">Remove property</SelectItem>
        </SelectContent>
      </Select>
      <p>Overlay opacity</p>
      <div className="flex items-center gap-3">
        <Slider
          min={0.1}
          max={1}
          step={0.05}
          value={[overlayOpacity]}
          onValueChange={(values) => setOverlayOpacity(values[0] ?? 0.5)}
        />
        <span className="w-10 text-right text-sm tabular-nums">
          {Math.round(overlayOpacity * 100)}%
        </span>
      </div>
    </div>
  );
}
