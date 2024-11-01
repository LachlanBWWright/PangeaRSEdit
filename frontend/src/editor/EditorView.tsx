import { useState } from "react";
import { Button } from "../components/Button";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { Fences } from "./subviews/Fences";
import { Stage } from "react-konva";
import { Updater } from "use-immer";

enum View {
  fences,
  topology,
  water,
  items,
  splines,
}

export function EditorView({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const [view, setView] = useState<View>(View.fences);
  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <div className="grid grid-cols-5 gap-2 w-full overflow-clip">
        <Button
          selected={view === View.fences}
          onClick={() => setView(View.fences)}
        >
          Fences
        </Button>
        <Button
          selected={view === View.topology}
          onClick={() => setView(View.topology)}
        >
          Topology
        </Button>
        <Button
          selected={view === View.water}
          onClick={() => setView(View.water)}
        >
          Water
        </Button>
        <Button
          selected={view === View.items}
          onClick={() => setView(View.items)}
        >
          Items
        </Button>
        <Button
          selected={view === View.splines}
          onClick={() => setView(View.splines)}
        >
          Splines
        </Button>
      </div>
      <Stage
        width={2000}
        height={2000}
        scaleX={0.2}
        scaleY={0.2}
        draggable={true}
        className="w-full min-h-0 flex-1 border-2 border-black overflow-clip"
      >
        <Fences data={data} setData={setData} />
      </Stage>
    </div>
  );
}
