/**
 * Convert any error-like value to a string for neverthrow Result<T, string> errors
 */
export const mapErr = (e: unknown): string => {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
};
