/**
 * Result type for error handling (inspired by Rust's Result<T, E>)
 * 
 * This provides a type-safe alternative to throwing exceptions,
 * allowing functions to return either a success value or an error.
 */

/** Represents a successful result containing a value of type T */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
  readonly error?: never;
}

/** Represents a failure result containing an error */
export interface Err<E = Error> {
  readonly ok: false;
  readonly error: E;
  readonly value?: never;
}

/** A Result is either Ok with a value, or Err with an error */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Create a successful result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E = Error>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Create an error result from a string message
 */
export function errMsg(message: string): Err<Error> {
  return { ok: false, error: new Error(message) };
}

/**
 * Type guard to check if a result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard to check if a result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Unwrap a result, returning the value if Ok, or throwing if Err
 * Use sparingly - prefer pattern matching with isOk/isErr
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap a result, returning the value if Ok, or a default value if Err
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Map a successful result to a new value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map an error to a new error type
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (!result.ok) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain multiple result-returning operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
}

/**
 * Convert a Promise that might reject to a Promise that returns a Result
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
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
 * Returns Err if index is out of bounds
 */
export function safeIndex<T>(arr: readonly T[], index: number): Result<T, Error> {
  if (index < 0 || index >= arr.length) {
    return err(new Error(`Index ${index} out of bounds for array of length ${arr.length}`));
  }
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
  key: K
): Result<NonNullable<T[K]>, Error> {
  const value = obj[key];
  if (value === undefined || value === null) {
    return err(new Error(`Property '${String(key)}' is not defined`));
  }
  return ok(value as NonNullable<T[K]>);
}

/**
 * Safely access a record/map by key
 * Returns Err if the key doesn't exist
 */
export function safeRecordGet<V>(
  record: Record<string | number, V>,
  key: string | number
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
    if (!result.ok) {
      return result;
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
  }
): U {
  if (result.ok) {
    return handlers.ok(result.value);
  }
  return handlers.err(result.error);
}
