import { installationSchema, type GameId, type HostError } from "@pangea/desktop-contracts";
import { z } from "zod";
import { desktopRequest } from "./client";

export type OpenPreviewGameSetup = (game: GameId) => void;

export async function previewGameInstalled(game: GameId, openSetup: OpenPreviewGameSetup) {
  const installed = await desktopRequest({ operation: "games.installed" }, z.array(installationSchema));
  if (installed.isErr()) return installed.map(() => false);
  const available = installed.value.some((entry) => entry.game === game);
  if (!available) openSetup(game);
  return installed.map(() => available);
}

export function handleMissingPreviewGame(error: HostError, game: GameId, openSetup: OpenPreviewGameSetup): boolean {
  if (error.code !== "not-installed") return false;
  openSetup(game);
  return true;
}
