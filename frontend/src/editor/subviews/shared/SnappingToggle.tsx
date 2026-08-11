import { useAtom } from "jotai";
import { Switch } from "@/components/ui/switch";
import { NubSnappingEnabled } from "@/data/snapping/snappingAtoms";

export function SnappingToggle() {
  const [enabled, setEnabled] = useAtom(NubSnappingEnabled);

  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>Snapping</span>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </label>
  );
}
