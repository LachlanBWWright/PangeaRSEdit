import { useSyncExternalStore } from "react";
import { formatLobbyGameLabel, formatLobbyModeLabel } from "@/multiplayer/lobbyDisplay";
import { getLevelOptionLabel, getTrackOptions } from "@/multiplayer/menuOptions";
import { cn } from "@/lib/utils";
import croMagArtwork from "../../../../games/pangea-ports/games/CroMagRally-Android/Data/Images/Loading1.jpg";
import nanosaurArtwork from "../../../../games/pangea-ports/games/Nanosaur2-Android/Data/Sprites/menu/menuback.jpg";
import type { MultiplayerSessionViewProps, MultiplayerUiState } from "./types";

type MultiplayerGameStageProps = Pick<
  MultiplayerSessionViewProps,
  "activeMatchConfigPresent" | "errorText" | "gameCanvasRef" | "isHost" | "lobby" | "uiState"
>;

function subscribeToPointerLock(onChange: () => void) {
  document.addEventListener("pointerlockchange", onChange);
  return () => document.removeEventListener("pointerlockchange", onChange);
}

function isGamePointerLocked() {
  return document.pointerLockElement?.id === "canvas";
}

function getStageStatus(uiState: MultiplayerUiState, gameName: string, isHost: boolean): string {
  switch (uiState) {
    case "connecting-peer":
    case "waiting-for-peer-runtime":
      return "Waiting for players to connect…";
    case "waiting-for-host-start":
      return isHost ? "Players are connected. Preparing to start…" : "Waiting for the host to start the match…";
    case "disconnected":
      return "The match could not start. Return to the lobby and try again.";
    default:
      return `Loading ${gameName}…`;
  }
}

export function MultiplayerGameStage({
  activeMatchConfigPresent,
  errorText,
  gameCanvasRef,
  isHost,
  lobby,
  uiState,
}: MultiplayerGameStageProps) {
  const gameName = formatLobbyGameLabel(lobby.gameId);
  const pointerLocked = useSyncExternalStore(subscribeToPointerLock, isGamePointerLocked, () => false);
  const mapName = getLevelOptionLabel(getTrackOptions(lobby.gameId, lobby.mode), lobby.trackOrLevel);
  const showStatus = !activeMatchConfigPresent || uiState !== "running";
  const isCroMag = lobby.gameId === "cromagrally";
  const waitingText = isHost
    ? "Start the match when your players are ready."
    : "Set your status to ready while the host prepares the match.";

  return (
    <section aria-label="Match stage" className="relative isolate min-h-64 min-w-0 overflow-hidden rounded-lg bg-black text-white [contain:layout_paint] lg:min-h-0">
      {activeMatchConfigPresent ? (
        <canvas
          id="canvas"
          ref={gameCanvasRef}
          className="absolute! inset-0! h-full! w-full! bg-black object-contain"
          aria-label="Multiplayer game"
          tabIndex={-1}
        />
      ) : null}
      {!showStatus && pointerLocked && (
        <p className="pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-center text-xs">
          Press Esc to release the mouse
        </p>
      )}
      <div
        className={cn(
          showStatus
            ? "relative isolate flex h-full min-h-64 flex-col items-center gap-3 bg-slate-950 px-5 py-8 text-center"
            : "sr-only",
          showStatus && (activeMatchConfigPresent ? "justify-center" : "justify-end"),
        )}
      >
        {!activeMatchConfigPresent ? (
          <>
            <img
              src={isCroMag ? croMagArtwork : nanosaurArtwork}
              alt=""
              className={cn(
                "absolute left-0 -z-20 w-full object-cover",
                isCroMag ? "-top-1/5 h-[120%] object-[center_25%]" : "top-0 h-full object-center",
              )}
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black via-black/70 to-black/20" />
          </>
        ) : null}
        {showStatus ? (
          <>
            <p className="text-base font-medium text-slate-300">{gameName} {formatLobbyModeLabel(lobby.mode)}</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{mapName}</h2>
          </>
        ) : null}
        <div role="status" className="max-w-sm text-sm text-slate-200">
          {showStatus
            ? activeMatchConfigPresent ? getStageStatus(uiState, gameName, isHost) : waitingText
            : "Match started"}
          {activeMatchConfigPresent && uiState === "disconnected" && errorText ? (
            <p className="mt-2 text-red-300">{errorText}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
