import React from "react";
import { Button } from "@/components/ui/button";
import LevelGrid from "../LevelGrid";
import { BugdomGlobals, type GlobalsInterface } from "@/data/globals/globals";

export default function BugdomLevels({
  openFile,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
}) {
  return (
    <LevelGrid title="Bugdom Levels">
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Training.ter", BugdomGlobals)
        }
      >
        Level 1
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Lawn.ter", BugdomGlobals)
        }
      >
        Level 2
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Pond.ter", BugdomGlobals)
        }
      >
        Level 3
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Beach.ter", BugdomGlobals)
        }
      >
        Level 4
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Flight.ter", BugdomGlobals)
        }
      >
        Level 5
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/BeeHive.ter", BugdomGlobals)
        }
      >
        Level 6
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/QueenBee.ter", BugdomGlobals)
        }
      >
        Level 7
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/Night.ter", BugdomGlobals)
        }
      >
        Level 8
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/AntHill.ter", BugdomGlobals)
        }
      >
        Level 9
      </Button>
      <Button
        onClick={() =>
          openFile("assets/bugdom/terrain/AntKing.ter", BugdomGlobals)
        }
      >
        Level 10
      </Button>
    </LevelGrid>
  );
}
