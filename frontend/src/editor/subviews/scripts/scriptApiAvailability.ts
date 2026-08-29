import type { ApiFunction } from "./scriptApiSchema";
import { isCapabilitySupported } from "./scriptCapabilityMatrix";

export function getAvailableApiFunctions(
  gameId: string,
  apis: readonly ApiFunction[],
): readonly ApiFunction[] {
  return apis.filter(
    (api) =>
      api.availabilityCapability === undefined ||
      isCapabilitySupported(gameId, api.availabilityCapability),
  );
}
