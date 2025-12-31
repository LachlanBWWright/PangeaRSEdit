import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import { CroMagGlobals, type GlobalsInterface } from "@/data/globals/globals";

export function CroMagLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <>
      <LevelGrid title="Cro-Mag Races">
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/StoneAge_Desert.ter", CroMagGlobals); }
          }
        >
          Desert
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/StoneAge_Jungle.ter", CroMagGlobals); }
          }
        >
          Jungle
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/StoneAge_Ice.ter", CroMagGlobals); }
          }
        >
          Ice
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/BronzeAge_Crete.ter", CroMagGlobals); }
          }
        >
          Crete
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/BronzeAge_China.ter", CroMagGlobals); }
          }
        >
          China
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/BronzeAge_Egypt.ter", CroMagGlobals); }
          }
        >
          Egypt
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/IronAge_Europe.ter", CroMagGlobals); }
          }
        >
          Europe
        </Button>
        <Button
          onClick={() =>
            { openFile(
              "assets/croMag/terrain/IronAge_Scandinavia.ter",
              CroMagGlobals,
            ); }
          }
        >
          Scandinavia
        </Button>
        <Button
          onClick={() =>
            { openFile(
              "assets/croMag/terrain/IronAge_Atlantis.ter",
              CroMagGlobals,
            ); }
          }
        >
          Atlantis
        </Button>
      </LevelGrid>

      <LevelGrid title="Cro-Mag Battles">
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Aztec.ter", CroMagGlobals); }
          }
        >
          Aztec
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Celtic.ter", CroMagGlobals); }
          }
        >
          Celtic
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Coliseum.ter", CroMagGlobals); }
          }
        >
          Coliseum
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Maze.ter", CroMagGlobals); }
          }
        >
          Maze
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Ramps.ter", CroMagGlobals); }
          }
        >
          Ramps
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_Spiral.ter", CroMagGlobals); }
          }
        >
          Spiral
        </Button>
        <Button
          onClick={() =>
            { openFile(
              "assets/croMag/terrain/Battle_StoneHenge.ter",
              CroMagGlobals,
            ); }
          }
        >
          Stonehenge
        </Button>
        <Button
          onClick={() =>
            { openFile("assets/croMag/terrain/Battle_TarPits.ter", CroMagGlobals); }
          }
        >
          Tar Pits
        </Button>
      </LevelGrid>
    </>
  );
}
