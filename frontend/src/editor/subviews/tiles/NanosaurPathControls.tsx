import { useAtom } from "jotai";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  editNanosaurPathLayerAtom,
  nanosaurPathTileAtom,
  showNanosaurPathLayerAtom,
} from "@/data/terrain/nanosaurPathAtoms";
import { NANOSAUR_PATH_TILES } from "@/data/terrain/nanosaurPathTiles";
import { NanosaurPathTileThumbnail } from "./NanosaurPathTileThumbnail";

export function NanosaurPathControls() {
  const [shown, setShown] = useAtom(showNanosaurPathLayerAtom);
  const [editing, setEditing] = useAtom(editNanosaurPathLayerAtom);
  const [tile, setTile] = useAtom(nanosaurPathTileAtom);

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2 p-2 text-sm">
      <strong className="col-span-2">Collision and path layer</strong>
      <span>Show overlay</span>
      <Switch checked={shown} onCheckedChange={setShown} />
      <span>Paint layer</span>
      <Switch checked={editing} onCheckedChange={(value) => {
        setEditing(value);
        if (value) setShown(true);
      }} />
      <span>Path tile</span>
      <Select value={tile.toString()} onValueChange={(value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) setTile(parsed);
      }}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {NANOSAUR_PATH_TILES.map((label, value) => (
            <SelectItem key={value} value={value.toString()}>
              <span className="flex items-center gap-2">
                {value === 0 ? (
                  <span className="h-6 w-6 rounded border border-gray-600 bg-gray-900" />
                ) : (
                  <NanosaurPathTileThumbnail value={value} />
                )}
                <span>{label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
