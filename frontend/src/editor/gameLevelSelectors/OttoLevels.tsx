import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import { OttoGlobals, type GlobalsInterface } from "@/data/globals/globals";

export function OttoLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Otto Matic Levels">
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/EarthFarm.ter", OttoGlobals); }
        }
      >
        Level 1
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/BlobWorld.ter", OttoGlobals); }
        }
      >
        Level 2
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/BlobBoss.ter", OttoGlobals); }
        }
      >
        Level 3
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/Apocalypse.ter", OttoGlobals); }
        }
      >
        Level 4
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/Cloud.ter", OttoGlobals); }
        }
      >
        Level 5
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/Jungle.ter", OttoGlobals); }
        }
      >
        Level 6
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/JungleBoss.ter", OttoGlobals); }
        }
      >
        Level 7
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/FireIce.ter", OttoGlobals); }
        }
      >
        Level 8
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/Saucer.ter", OttoGlobals); }
        }
      >
        Level 9
      </Button>
      <Button
        onClick={() =>
          { openFile("assets/ottoMatic/terrain/BrainBoss.ter", OttoGlobals); }
        }
      >
        Level 10
      </Button>
    </LevelGrid>
  );
}
