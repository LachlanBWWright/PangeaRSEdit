import { skeletonSpecs } from "../../python/structSpecs/skeleton/skeleton";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";

/**
 * Parse a skeleton resource using rsrcdump-ts and skeletonSpecs
 * @param bytes The binary data to parse
 * @returns Promise resolving to the parsed JSON object result
 */
export async function parseSkeletonRsrc({
  bytes,
}: {
  bytes: ArrayBuffer;
  only_types?: string[];
  skip_types?: string[];
  adf?: "True" | "False";
}): Promise<unknown> {
  const uint8Array = new Uint8Array(bytes);
  const parseResult = await saveToJson(
    uint8Array,
    skeletonSpecs,
    [], // includeTypes
    [], // excludeTypes
  );

  if (!parseResult.ok) {
    throw new Error(parseResult.error);
  }

  return JSON.parse(parseResult.value);
}
