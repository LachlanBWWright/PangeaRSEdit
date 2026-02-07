import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LevelGrid } from "../LevelGrid";
import { Bugdom2Globals, type GlobalsInterface } from "@/data/globals/globals";
import { parseTunnelFile } from "@/data/tunnelParser/parseTunnelFile";
import type { TunnelData } from "@/data/tunnelParser/types";
import { toast } from "sonner";

export function Bugdom2Levels({
  openFile,
  onTunnelLoad,
}: {
  openFile: (url: string, gameType: GlobalsInterface) => void;
  onTunnelLoad?: (data: TunnelData, fileName: string) => void;
}) {
  const loadTunnelLevel = useCallback(
    async (tunnelPath: string, fileName: string) => {
      if (!onTunnelLoad) return;

      try {
        const response = await fetch(tunnelPath);
        if (!response.ok) {
          toast.error(`Failed to fetch ${fileName}`, {
            description: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        }

        const buffer = await response.arrayBuffer();
        const result = parseTunnelFile(buffer);

        if (!result.ok) {
          toast.error("Failed to parse tunnel file", {
            description: result.error.message,
          });
          return;
        }

        onTunnelLoad(result.value, fileName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error("Failed to load tunnel level", {
          description: message,
        });
      }
    },
    [onTunnelLoad]
  );

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
        onClick={() => loadTunnelLevel("games/bugdom2/tunnels/Plumbing.tun", "Plumbing.tun")}
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
        onClick={() => loadTunnelLevel("games/bugdom2/tunnels/Gutter.tun", "Gutter.tun")}
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
