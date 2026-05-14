export type TerrainIoErrorCode =
  | "terrain.decode.failed"
  | "terrain.encode.failed"
  | "terrain.decode.invalid-message"
  | "terrain.decode.bad-format"
  | "terrain.decode.no-canvas-context"
  | "terrain.codec.invalid-response"
  | "terrain.codec.unavailable";

export interface TerrainIoError {
  readonly code: TerrainIoErrorCode;
  readonly message: string;
}

/** Creates a typed terrain I/O error object. */
export function terrainIoError(
  code: TerrainIoErrorCode,
  message: string,
): TerrainIoError {
  return { code, message };
}
