import { err, ok, type Result } from "neverthrow";
import type { MultiplayerMatchConfig } from "./types";

interface LocalRuntimeCompatibility {
  readonly protocolVersion: number;
  readonly runtimeVersion: string;
  readonly contentHash: string;
}

export function validateRuntimeCompatibility(
  matchConfig: MultiplayerMatchConfig,
  local: LocalRuntimeCompatibility,
): Result<void, string> {
  if (matchConfig.requiredProtocolVersion !== local.protocolVersion) {
    return err(
      `Unsupported multiplayer protocol version ${String(matchConfig.requiredProtocolVersion)} (expected ${String(local.protocolVersion)})`,
    );
  }
  if (matchConfig.requiredRuntimeVersion !== local.runtimeVersion) {
    return err(
      `Unsupported multiplayer runtime version ${matchConfig.requiredRuntimeVersion}`,
    );
  }
  if (matchConfig.requiredContentHash !== local.contentHash) {
    return err(
      `Multiplayer content mismatch: server requires ${matchConfig.requiredContentHash}, local bundle is ${local.contentHash}`,
    );
  }
  return ok(undefined);
}
