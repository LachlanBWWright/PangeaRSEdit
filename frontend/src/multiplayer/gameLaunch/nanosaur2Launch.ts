import { Result, err, ok } from "neverthrow";
import { MultiplayerMatchConfigSchema } from "@/multiplayer/schemas";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";

export interface Nanosaur2LaunchOptions {
  readonly matchConfig: unknown;
  readonly installBridge: () => Result<void, string>;
  readonly startNetworkMatch: (
    matchConfig: MultiplayerMatchConfig,
  ) => Result<void, string>;
}

export function launchNanosaur2NetworkMatch(
  options: Nanosaur2LaunchOptions,
): Result<MultiplayerMatchConfig, string> {
  const parsedConfig = MultiplayerMatchConfigSchema.safeParse(
    options.matchConfig,
  );
  if (!parsedConfig.success) {
    return err("Nanosaur 2 launch config is invalid");
  }

  const bridgeResult = options.installBridge();
  if (bridgeResult.isErr()) {
    return err(bridgeResult.error);
  }

  const startResult = options.startNetworkMatch(parsedConfig.data);
  if (startResult.isErr()) {
    return err(startResult.error);
  }

  return ok(parsedConfig.data);
}
