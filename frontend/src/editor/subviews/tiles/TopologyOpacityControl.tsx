import { Slider } from "@/components/ui/slider";
import { TopologyOpacity } from "@/data/tiles/tileAtoms";
import { useAtom } from "jotai";

export function TopologyOpacityControl() {
  const [opacity, setOpacity] = useAtom(TopologyOpacity);

  return (
    <div className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:col-span-4">
      <p>Topology opacity</p>
      <Slider
        min={0.1}
        max={1}
        step={0.05}
        value={[opacity]}
        onValueChange={(values) => setOpacity(values[0] ?? 1)}
      />
      <span className="w-10 text-right text-sm tabular-nums">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}
