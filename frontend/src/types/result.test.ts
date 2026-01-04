import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  errMsg,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  safeIndex,
  safeGet,
  safeRecordGet,
  all,
  match,
  Result,
} from "./result";

describe("Result type", () => {
  describe("ok and err constructors", () => {
    it("should create an Ok result with ok()", () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it("should create an Err result with err()", () => {
      const error = new Error("test error");
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });

    it("should create an Err result with errMsg()", () => {
      const result = errMsg("test error");
      expect(result.ok).toBe(false);
      expect(result.error.message).toBe("test error");
    });
  });

  describe("type guards", () => {
    it("isOk should return true for Ok results", () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it("isErr should return true for Err results", () => {
      const result = err(new Error("test"));
      expect(isErr(result)).toBe(true);
      expect(isOk(result)).toBe(false);
    });
  });

  describe("unwrap functions", () => {
    it("unwrap should return value for Ok results", () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it("unwrap should throw for Err results", () => {
      const result = err(new Error("test error"));
      expect(() => unwrap(result)).toThrow("test error");
    });

    it("unwrapOr should return value for Ok results", () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it("unwrapOr should return default for Err results", () => {
      const result: Result<number, Error> = err(new Error("test"));
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe("map functions", () => {
    it("map should transform Ok values", () => {
      const result = ok(21);
      const mapped = map(result, (x) => x * 2);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      } else {
        throw new Error("expected Ok");
      }
    });

    it("map should pass through Err values", () => {
      const error = new Error("test");
      const result: Result<number, Error> = err(error);
      const mapped = map(result, (x) => (x ?? 0) * 2);
      if (isErr(mapped)) {
        expect(mapped.error).toBe(error);
      } else {
        throw new Error("expected Err");
      }
    });

    it("mapErr should transform Err values", () => {
      const result: Result<number, string> = err("error");
      const mapped = mapErr(result, (e) => new Error(e));
      if (isErr(mapped)) {
        expect(mapped.error.message).toBe("error");
      } else {
        throw new Error("expected Err");
      }
    });

    it("mapErr should pass through Ok values", () => {
      const result: Result<number, string> = ok(42);
      const mapped = mapErr(result, (e) => new Error(e));
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      } else {
        throw new Error("expected Ok");
      }
    });
  });

  describe("andThen function", () => {
    it("should chain successful operations", () => {
      const result = ok(10);
      const chained = andThen(result, (x) => ok(x * 2));
      if (isOk(chained)) {
        expect(chained.value).toBe(20);
      } else {
        throw new Error("expected Ok");
      }
    });

    it("should short-circuit on error", () => {
      const result: Result<number, Error> = err(new Error("first error"));
      const chained = andThen(result, (x) => ok((x ?? 0) * 2));
      if (isErr(chained)) {
        expect(chained.error.message).toBe("first error");
      } else {
        throw new Error("expected Err");
      }
    });

    it("should propagate error from chained function", () => {
      const result = ok(10);
      const chained = andThen(result, () => err(new Error("second error")));
      if (isErr(chained)) {
        expect(chained.error.message).toBe("second error");
      } else {
        throw new Error("expected Err");
      }
    });
  });

  describe("safe access functions", () => {
    describe("safeIndex", () => {
      it("should return Ok for valid index", () => {
        const arr = [1, 2, 3];
        const result = safeIndex(arr, 1);
        expect(isOk(result) && result.value).toBe(2);
      });

      it("should return Err for negative index", () => {
        const arr = [1, 2, 3];
        const result = safeIndex(arr, -1);
        expect(isErr(result)).toBe(true);
      });

      it("should return Err for out of bounds index", () => {
        const arr = [1, 2, 3];
        const result = safeIndex(arr, 5);
        expect(isErr(result)).toBe(true);
      });
    });

    describe("safeGet", () => {
      it("should return Ok for existing property", () => {
        const obj = { a: 1, b: 2 };
        const result = safeGet(obj, "a");
        expect(isOk(result) && result.value).toBe(1);
      });

      it("should return Err for undefined property", () => {
        const obj: { a?: number } = {};
        const result = safeGet(obj, "a");
        expect(isErr(result)).toBe(true);
      });
    });

    describe("safeRecordGet", () => {
      it("should return Ok for existing key", () => {
        const record: Record<string, number> = { a: 1, b: 2 };
        const result = safeRecordGet(record, "a");
        expect(isOk(result) && result.value).toBe(1);
      });

      it("should return Err for missing key", () => {
        const record: Record<string, number> = { a: 1 };
        const result = safeRecordGet(record, "b");
        expect(isErr(result)).toBe(true);
      });
    });
  });

  describe("all function", () => {
    it("should combine successful results", () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      if (isOk(combined)) {
        expect(combined.value).toEqual([1, 2, 3]);
      } else {
        throw new Error("expected Ok");
      }
    });

    it("should return first error", () => {
      const results: Result<number, Error>[] = [
        ok(1),
        err(new Error("error")),
        ok(3),
      ];
      const combined = all(results);
      if (isErr(combined)) {
        expect(combined.error.message).toBe("error");
      } else {
        throw new Error("expected Err");
      }
    });
  });

  describe("match function", () => {
    it("should call ok handler for Ok results", () => {
      const result = ok(42);
      const matched = match(result, {
        ok: (v) => `value: ${v}`,
        err: (e) => `error: ${(e as unknown as Error).message}`,
      });
      expect(matched).toBe("value: 42");
    });

    it("should call err handler for Err results", () => {
      const result = err(new Error("test"));
      const matched = match(result, {
        ok: (v) => `value: ${v}`,
        err: (e) => `error: ${e.message}`,
      });
      expect(matched).toBe("error: test");
    });
  });
});
