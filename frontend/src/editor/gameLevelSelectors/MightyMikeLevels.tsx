import { Button } from "@/components/ui/button";
import {
  MightyMikeGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";

export function MightyMikeLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-40">
      <p className="text-2xl">Mighty Mike Levels</p>
      <div className="flex flex-col gap-1">
        {/* Prehistoric Plaza */}
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/jurassic.map-1",
              MightyMikeGlobals,
            )
          }
        >
          Prehistoric Plaza 1
        </Button>
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/jurassic.map-2",
              MightyMikeGlobals,
            )
          }
        >
          Prehistoric Plaza 2
        </Button>
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/jurassic.map-3",
              MightyMikeGlobals,
            )
          }
        >
          Prehistoric Plaza 3
        </Button>

        {/* Candy Cane Lane */}
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/candy.map-1", MightyMikeGlobals)
          }
        >
          Candy Cane Lane 1
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/candy.map-2", MightyMikeGlobals)
          }
        >
          Candy Cane Lane 2
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/candy.map-3", MightyMikeGlobals)
          }
        >
          Candy Cane Lane 3
        </Button>

        {/* Fairy Tale Trail */}
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/fairy.map-1", MightyMikeGlobals)
          }
        >
          Fairy Tale Trail 1
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/fairy.map-2", MightyMikeGlobals)
          }
        >
          Fairy Tale Trail 2
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/fairy.map-3", MightyMikeGlobals)
          }
        >
          Fairy Tale Trail 3
        </Button>

        {/* Magic Funhouse */}
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/clown.map-1", MightyMikeGlobals)
          }
        >
          Magic Funhouse 1
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/clown.map-2", MightyMikeGlobals)
          }
        >
          Magic Funhouse 2
        </Button>
        <Button
          onClick={() =>
            openFile("assets/mightyMike/terrain/clown.map-3", MightyMikeGlobals)
          }
        >
          Magic Funhouse 3
        </Button>

        {/* Bargain Bin */}
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/bargain.map-1",
              MightyMikeGlobals,
            )
          }
        >
          Bargain Bin 1
        </Button>
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/bargain.map-2",
              MightyMikeGlobals,
            )
          }
        >
          Bargain Bin 2
        </Button>
        <Button
          onClick={() =>
            openFile(
              "assets/mightyMike/terrain/bargain.map-3",
              MightyMikeGlobals,
            )
          }
        >
          Bargain Bin 3
        </Button>
      </div>
    </div>
  );
}
