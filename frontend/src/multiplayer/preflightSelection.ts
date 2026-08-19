import { Result, err, ok } from "neverthrow";
import { runRuntimePreflight } from "@/multiplayer/runtimePreflight/runRuntimePreflight";
import { progressToast } from "@/toasts/progressToast";
import { resolveMultiplayerLaunchSpecFromSelection } from "./launchSpec";

export async function preflightSelection(
  gameId: string,
  trackOrLevel: string,
): Promise<Result<void, string>> {
  const toastId = "multiplayer-game-preload-progress";
  const spec = resolveMultiplayerLaunchSpecFromSelection(gameId, trackOrLevel);
  if (!spec) {
    progressToast.fail({
      id: toastId,
      title: "Failed to preload game",
      description: `Unsupported multiplayer game: ${gameId}`,
    });
    return err(`Unsupported multiplayer game: ${gameId}`);
  }
  progressToast.start({
    id: toastId,
    title: "Preloading game...",
    description: `${gameId} ${trackOrLevel}`,
    current: 0,
    completed: 3,
  });
  const result = await runRuntimePreflight({
    config: spec.config,
    gameId,
    trackOrLevel,
    onProgress: (progress) => {
      progressToast.update({
        id: toastId,
        title: progress.title,
        description: progress.description,
        current: progress.current,
        completed: progress.completed,
      });
    },
  });
  if (result.isErr()) {
    progressToast.fail({
      id: toastId,
      title: "Failed to preload game",
      description: result.error.message,
    });
    return err(result.error.message);
  }
  progressToast.complete({
    id: toastId,
    title: "Game preloaded",
    description: `${String(result.value.assetUrlsChecked.length)} runtime assets checked`,
  });
  return ok(undefined);
}
