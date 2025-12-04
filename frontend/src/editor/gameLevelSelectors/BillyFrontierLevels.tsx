import { Button } from "@/components/ui/button";
import LevelGrid from "../LevelGrid";
import {
  BillyFrontierGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";

export default function BillyFrontierLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Billy Frontier Levels">
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/swamp_duel.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Swamp Duel
      </Button>
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/swamp_shootout.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Swamp Shootout
      </Button>
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/swamp_stampede.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Swamp Stampede
      </Button>
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/town_duel.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Town Duel
      </Button>
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/town_shootout.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Town Shootout
      </Button>
      <Button
        onClick={() =>
          openFile(
            "assets/billyFrontier/terrain/town_stampede.ter",
            BillyFrontierGlobals,
          )
        }
      >
        Town Stampede
      </Button>
    </LevelGrid>
  );
}
