import { Card, CardContent } from "@/components/ui/card";
import type { MultiplayerSessionViewProps } from "./types";

type MultiplayerGameStageProps = Pick<
  MultiplayerSessionViewProps,
  | "activeMatchConfigPresent"
  | "gameCanvasRef"
>;

export function MultiplayerGameStage({
  activeMatchConfigPresent,
  gameCanvasRef,
}: MultiplayerGameStageProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
      <Card className="min-h-0 flex-1 border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
        <CardContent className="flex h-full min-h-0 items-center justify-center p-0">
          {activeMatchConfigPresent ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
              <canvas
                id="canvas"
                ref={gameCanvasRef}
                className="h-full max-h-full w-full max-w-full bg-black object-contain"
                aria-label="Multiplayer Game"
                tabIndex={-1}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-80 w-full items-center justify-center bg-black px-4 text-center">
              <div className="max-w-sm space-y-2">
                <div className="text-lg font-semibold">
                  Waiting for Match Start
                </div>
                <div className="text-sm text-slate-400">
                  Ready up in the lobby sidebar. The game window will launch
                  here when the host starts the match.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
