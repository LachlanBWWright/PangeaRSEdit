export const mapErr = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));
