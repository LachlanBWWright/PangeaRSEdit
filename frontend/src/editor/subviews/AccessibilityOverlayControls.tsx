import { useAtom, useAtomValue } from "jotai";
import { ShowAccessibilityOverlay } from "@/data/tiles/tileAtoms";
import { Switch } from "@/components/ui/switch";
import { Globals } from "@/data/globals/globals";
import {
  getAccessibilityOverlayLabel,
  supportsAccessibilityOverlay,
} from "../utils/terrainAccessibility";

export function AccessibilityOverlayControls() {
  const globals = useAtomValue(Globals);
  const [showAccessibilityOverlay, setShowAccessibilityOverlay] = useAtom(
    ShowAccessibilityOverlay,
  );

  if (!supportsAccessibilityOverlay(globals.GAME_TYPE)) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded bg-gray-800 px-3 py-2 text-sm text-white">
      <p>{getAccessibilityOverlayLabel(globals.GAME_TYPE)}</p>
      <Switch
        checked={showAccessibilityOverlay}
        onCheckedChange={setShowAccessibilityOverlay}
      />
    </div>
  );
}
