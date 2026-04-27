export type TerrainIoErrorCode =
  | "terrain.decode.failed"
  | "terrain.decode.invalid-message"
  | "terrain.decode.bad-format"
  | "terrain.decode.no-canvas-context";

export interface TerrainIoError {
  readonly code: TerrainIoErrorCode;
  readonly message: string;
}

export function terrainIoError(
  code: TerrainIoErrorCode,
  message: string,
): TerrainIoError {
  return { code, message };
}
