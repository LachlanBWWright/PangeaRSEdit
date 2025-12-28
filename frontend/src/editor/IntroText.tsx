import { Button } from "@/components/ui/button";

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
        This is a work in progress level editor for Otto Matic, with preliminary
        support for other Pangea Software games.
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
