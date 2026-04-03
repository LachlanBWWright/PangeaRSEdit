import { useAtom, useAtomValue } from "jotai";
import { ShowAccessibilityOverlay } from "@/data/tiles/tileAtoms";
import { Switch } from "@/components/ui/switch";
import { Game, Globals } from "@/data/globals/globals";
import {
  BUGDOM_ACCESSIBILITY_MIN_GAP,
  NANOSAUR2_MAX_REACHABLE_HEIGHT,
  NANOSAUR_MAX_REACHABLE_HEIGHT,
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

  let label = "Mask inaccessible terrain";
  if (globals.GAME_TYPE === Game.BUGDOM) {
    label = `Mask low-ceiling areas (< ${BUGDOM_ACCESSIBILITY_MIN_GAP})`;
  } else if (globals.GAME_TYPE === Game.NANOSAUR) {
    label = `Mask heights above ${NANOSAUR_MAX_REACHABLE_HEIGHT}`;
  } else if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    label = `Mask heights above ${NANOSAUR2_MAX_REACHABLE_HEIGHT}`;
  }

  return (
    <div className="flex items-center justify-between rounded bg-gray-800 px-3 py-2 text-sm text-white">
      <p>{label}</p>
      <Switch
        checked={showAccessibilityOverlay}
        onCheckedChange={setShowAccessibilityOverlay}
      />
    </div>
  );
}
