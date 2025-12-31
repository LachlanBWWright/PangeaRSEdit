import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import {
  Nanosaur2Globals,
  type GlobalsInterface,
} from "@/data/globals/globals";

export function Nanosaur2Levels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Nanosaur 2 Levels">
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/level1.ter", Nanosaur2Globals); }
        }
      >
        Level 1
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/level2.ter", Nanosaur2Globals); }
        }
      >
        Level 2
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/level3.ter", Nanosaur2Globals); }
        }
      >
        Level 3
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/battle1.ter", Nanosaur2Globals); }
        }
      >
        Battle 1
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/battle2.ter", Nanosaur2Globals); }
        }
      >
        Battle 2
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/race1.ter", Nanosaur2Globals); }
        }
      >
        Race 1
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/race2.ter", Nanosaur2Globals); }
        }
      >
        Race 2
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/flag1.ter", Nanosaur2Globals); }
        }
      >
        CTF 1
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/nanosaur2/terrain/flag2.ter", Nanosaur2Globals); }
        }
      >
        CTF 2
      </Button>
    </LevelGrid>
  );
}
