import { Result, ResultAsync } from "neverthrow";
import { z } from "zod";

export function boundaryMessage(error: unknown): string {
  const parsed = z.object({ message: z.string() }).safeParse(error);
  if (parsed.success) return parsed.data.message;
  const text = z.string().safeParse(error);
  return text.success ? text.data : "External operation failed";
}

export function external<T>(operation: () => Promise<T>): ResultAsync<T, string> {
  return Result.fromThrowable(operation, boundaryMessage)().asyncAndThen((promise) => ResultAsync.fromPromise(promise, boundaryMessage));
}

export function copyArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
