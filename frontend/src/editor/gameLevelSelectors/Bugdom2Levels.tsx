import { useRef, useCallback } from "react";
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
  const tunnelInputRef = useRef<HTMLInputElement>(null);
  const pendingLevelRef = useRef<string>("");

  const handleTunnelFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onTunnelLoad) return;

      const buffer = await file.arrayBuffer();
      const result = parseTunnelFile(buffer);

      if (!result.ok) {
        toast.error("Failed to parse tunnel file", {
          description: result.error.message,
        });
        return;
      }

      // Use the pending level name if set, otherwise use actual filename
      const fileName = pendingLevelRef.current || file.name;
      onTunnelLoad(result.value, fileName);
      
      // Reset the input so the same file can be selected again
      if (tunnelInputRef.current) {
        tunnelInputRef.current.value = "";
      }
      pendingLevelRef.current = "";
    },
    [onTunnelLoad]
  );

  const openTunnelDialog = useCallback((levelName: string) => {
    pendingLevelRef.current = levelName;
    tunnelInputRef.current?.click();
  }, []);

  return (
    <LevelGrid title="Bugdom 2 Levels">
      {/* Hidden file input for tunnel uploads */}
      <input
        ref={tunnelInputRef}
        type="file"
        accept=".tun"
        onChange={handleTunnelFileChange}
        className="hidden"
      />
      
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
        onClick={() => openTunnelDialog("Plumbing.tun")}
        title="Click to upload Plumbing.tun"
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
        onClick={() => openTunnelDialog("Gutter.tun")}
        title="Click to upload Gutter.tun"
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
