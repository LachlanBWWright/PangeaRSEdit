export type CodecLogSink = (level: "debug" | "warning" | "error", values: readonly unknown[]) => void;
let sink: CodecLogSink = () => undefined;

export function setCodecLogger(next: CodecLogSink): void { sink = next; }

export const codecLogger = {
  log: (...values: unknown[]): void => sink("debug", values),
  warn: (...values: unknown[]): void => sink("warning", values),
  error: (...values: unknown[]): void => sink("error", values),
};
