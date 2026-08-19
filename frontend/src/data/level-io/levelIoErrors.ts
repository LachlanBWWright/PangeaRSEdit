export type LevelIoErrorCode =
  | "worker.unavailable"
  | "worker.invalid-request"
  | "worker.invalid-response"
  | "worker.failed"
  | "parse.failed"
  | "serialize.failed"
  | "preview.failed"
  | "snapshot.failed";

export interface LevelIoError {
  readonly code: LevelIoErrorCode;
  readonly message: string;
}

export function levelIoError(
  code: LevelIoErrorCode,
  message: string,
): LevelIoError {
  return { code, message };
}
