/**
 * Result type for error handling (inspired by Rust's Result<T, E>)
 *
 * This module wraps NeverThrow to provide a consistent Result API
 * while keeping the existing helper utilities.
 */

import {
  err as neverthrowErr,
  ok as neverthrowOk,
  Result as NeverthrowResult,
  ResultAsync,
  Ok,
  Err,
} from "neverthrow";

declare module "neverthrow" {
  interface Ok<T, E> {
    readonly ok: true;
    readonly _neverthrowTypes?: [T, E];
  }

  interface Err<T, E> {
    readonly ok: false;
    readonly _neverthrowTypes?: [T, E];
  }
}

const ensureLegacyOkFlag = () => {
  if (!Object.prototype.hasOwnProperty.call(Ok.prototype, "ok")) {
    Object.defineProperty(Ok.prototype, "ok", {
      get: () => true,
    });
  }
  if (!Object.prototype.hasOwnProperty.call(Err.prototype, "ok")) {
    Object.defineProperty(Err.prototype, "ok", {
      get: () => false,
    });
  }
};

ensureLegacyOkFlag();

/** A Result is either Ok with a value, or Err with an error */
export type Result<T, E = Error> = NeverthrowResult<T, E>;

/**
 * Create a successful result
 */
export function ok<T>(value: T): Ok<T, never> {
  return neverthrowOk(value);
}

/**
 * Create an error result
 */
export function err<E = Error>(error: E): Err<never, E> {
  return neverthrowErr(error);
}

/**
 * Create an error result from a string message
 */
export function errMsg(message: string): Err<never, Error> {
  return err(new Error(message));
}

/**
 * Type guard to check if a result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T, E> {
  return result.isOk();
}

/**
 * Type guard to check if a result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<T, E> {
  return result.isErr();
}

/**
 * Unwrap a result, returning the value if Ok, or throwing if Err
 * Use sparingly - prefer pattern matching with isOk/isErr
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isOk()) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a result, returning the value if Ok, or a default value if Err
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.unwrapOr(defaultValue);
}

/**
 * Map a successful result to a new value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.map(fn);
}

/**
 * Map an error to a new error type
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.mapErr(fn);
}

/**
 * Chain multiple result-returning operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.andThen(fn);
}

/**
 * Convert a Promise that might reject to a Promise that returns a Result
 */
export async function fromPromise<T>(
  promise: Promise<T>,
): Promise<Result<T, Error>> {
  return await ResultAsync.fromPromise(promise, (error) =>
    error instanceof Error ? error : new Error(String(error)),
  );
}

/**
 * Wrap a function that might throw into one that returns a Result
 */
export function tryFn<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Safely access an array element by index
 * Returns Err if index is out of bounds or element is undefined (for sparse arrays)
 */
export function safeIndex<T>(
  arr: readonly T[],
  index: number,
): Result<T, Error> {
  if (index < 0 || index >= arr.length) {
    return err(
      new Error(`Index ${index} out of bounds for array of length ${arr.length}`),
    );
  }
  // With noUncheckedIndexedAccess, arr[index] is T | undefined
  // The undefined check handles sparse arrays where a valid index may still be undefined
  const value = arr[index];
  if (value === undefined) {
    return err(new Error(`Array element at index ${index} is undefined`));
  }
  return ok(value);
}

/**
 * Safely access an object property
 * Returns Err if the property is undefined
 */
export function safeGet<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): Result<NonNullable<T[K]>, Error> {
  const value = obj[key];
  if (value === undefined || value === null) {
    return err(new Error(`Property '${String(key)}' is not defined`));
  }
  return ok(value);
}

/**
 * Safely access a record/map by key
 * Returns Err if the key doesn't exist
 */
export function safeRecordGet<V>(
  record: Record<string | number, V>,
  key: string | number,
): Result<V, Error> {
  const value = record[key];
  if (value === undefined) {
    return err(new Error(`Key '${key}' not found in record`));
  }
  return ok(value);
}

/**
 * Combine multiple results into a single result containing an array of values
 * If any result is Err, returns the first Err
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isErr()) {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Match on a result, calling the appropriate handler
 */
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => U;
    err: (error: E) => U;
  },
): U {
  return result.match(handlers.ok, handlers.err);
}
