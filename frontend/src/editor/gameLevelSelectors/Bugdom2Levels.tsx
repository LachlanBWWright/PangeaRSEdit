import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import { Bugdom2Globals, type GlobalsInterface } from "@/data/globals/globals";

export function Bugdom2Levels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Bugdom 2 Levels">
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level1_Garden.ter", Bugdom2Globals)
        }
      >
        Level 1
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level2_SideWalk.ter", Bugdom2Globals)
        }
      >
        Level 2
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level3_DogHair.ter", Bugdom2Globals)
        }
      >
        Level 3
      </Button>
      <Button
        variant="outline"
        disabled
        title="Level 4 (Plumbing) is a tunnel level - upload a .tun file below"
      >
        Level 4 (Tunnel)
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level5_Playroom.ter", Bugdom2Globals)
        }
      >
        Level 5
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level6_Closet.ter", Bugdom2Globals)
        }
      >
        Level 6
      </Button>
      <Button
        variant="outline"
        disabled
        title="Level 7 (Gutter) is a tunnel level - upload a .tun file below"
      >
        Level 7 (Tunnel)
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level8_Garbage.ter", Bugdom2Globals)
        }
      >
        Level 8
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level9_Balsa.ter", Bugdom2Globals)
        }
      >
        Level 9
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom2/terrain/Level10_Park.ter", Bugdom2Globals)
        }
      >
        Level 10
      </Button>
    </LevelGrid>
  );
}
