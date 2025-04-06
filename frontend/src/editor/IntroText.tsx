import { Button } from "@/components/Button";

export function IntroText() {
  return (
    <>
      <p className="text-6xl pb-2">Pangea Level Editor</p>
      <Button
        onClick={() =>
          window.open("https://github.com/LachlanBWWright/PangeaRSEdit")
        }
      >
        View on GitHub
      </Button>
      <p>
        This is a work in progress level editor for Otto Matic (And hopefully
        additional Pangea Software games).
      </p>
      <p>
        Introducing items that were not originally found in the level will be
        likely to cause Otto Matic to crash. Downloaded levels can be used by
        replacing the existing by level data, which can be found in the Terrain
        folder within Otto's Data folder. Otto Matic has strict limits for
        enemies, which means that placed enemy items may not appear. This can be
        bypassed by adding enemies as spline items.
      </p>
      <p>
        {" "}
        This project uses{" "}
        <a
          className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
          href="https://github.com/jorio/rsrcdump"
        >
          RSRCDump
        </a>{" "}
        by Jorio, the creator of the ports of Pangea games to modern day
        operating systems. Any feedback is appreciated!
      </p>
    </>
  );
}
