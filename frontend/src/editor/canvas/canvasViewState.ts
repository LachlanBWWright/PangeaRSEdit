import { View } from "@/editor/viewEnum";

export function supportsThreeCanvas(view: View): boolean {
  return (
    view === View.fences ||
    view === View.water ||
    view === View.items ||
    view === View.splines ||
    view === View.tiles
  );
}
