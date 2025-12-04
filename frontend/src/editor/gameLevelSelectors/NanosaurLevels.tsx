import { Button } from "@/components/ui/button";
import LevelGrid from "../LevelGrid";
import { NanosaurGlobals, type GlobalsInterface } from "@/data/globals/globals";

export default function NanosaurLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Nanosaur Levels">
      <Button
        onClick={() =>
          openFile("assets/nanosaur/terrain/Level1.ter", NanosaurGlobals)
        }
      >
        Default
      </Button>
      <Button
        onClick={() =>
          openFile("assets/nanosaur/terrain/Level1Pro.ter", NanosaurGlobals)
        }
      >
        Extreme
      </Button>
    </LevelGrid>
  );
}
