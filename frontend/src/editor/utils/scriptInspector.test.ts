import { expect, it, vi } from "vitest";
import { inspectorFixture } from "../../../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { parseScriptObjectHandle, queryScriptInspector, queryScriptObjects } from "./scriptInspector";
import { scriptDiagnosticsSchema, scriptInspectorSchema } from "@pangea/desktop-contracts";

it("reads and validates the native inspector without mutating the runtime", () => {
  const ccall = vi.fn(() => JSON.stringify(inspectorFixture));
  const result = queryScriptInspector({ ccall });
  expect(result.isOk() ? result.value : result.error).toEqual(inspectorFixture);
  expect(ccall).toHaveBeenCalledExactlyOnceWith("PangeaScript_GetStatusInspectorJSON", "string", [], []);
});

it.each([undefined, "invalid JSON", "null", '{"version":2}', JSON.stringify({ ...inspectorFixture, registeredObjects: -1 })])(
  "rejects absent, malformed or unsupported snapshots: %s", (value) => {
    expect(queryScriptInspector({ ccall: () => value }).isErr()).toBe(true);
  },
);

it("reports unavailable runtimes clearly", () => {
  expect(queryScriptInspector(null).isErr()).toBe(true);
  expect(queryScriptInspector({}).isErr()).toBe(true);
});

it("reads later pages and exact generations using bounded native requests", () => {
  const page = { objects: inspectorFixture.objects, offset: 64, nextOffset: 66, total: 100, truncated: true, error: null };
  const ccall = vi.fn(() => JSON.stringify(page));
  const later = queryScriptObjects({ ccall }, { offset: 64, scriptedOnly: true });
  expect(later.isOk() ? later.value : later.error).toEqual(page);
  expect(ccall).toHaveBeenCalledWith("PangeaScript_GetObjectInspectorPageJSON", "string", ["number", "number", "number"], [64, 64, 1]);
  ccall.mockReturnValue(JSON.stringify({ objects: inspectorFixture.objects.slice(0, 1), error: null }));
  const exact = queryScriptObjects({ ccall }, { offset: 0, scriptedOnly: false, handle: { id: 99, generation: 7 } });
  expect(exact.isOk()).toBe(true);
  expect(ccall).toHaveBeenLastCalledWith("PangeaScript_GetObjectInspectorJSON", "string", ["number", "number"], [99, 7]);
});

it("rejects stale handles and pages that cannot advance", () => {
  expect(queryScriptObjects({ ccall: () => JSON.stringify({ objects: [], error: "Object handle is stale" }) }, { offset: 0, scriptedOnly: false, handle: { id: 1, generation: 9 } }).isErr()).toBe(true);
  expect(queryScriptObjects({ ccall: () => JSON.stringify({ objects: [], offset: 64, nextOffset: 64, total: 100, truncated: true, error: null }) }, { offset: 64, scriptedOnly: false }).isErr()).toBe(true);
});

it("validates complete handles without accepting partial or unsafe numbers", () => {
  const handle = parseScriptObjectHandle(" 130:3 ");
  expect(handle.isOk() ? handle.value : handle.error).toEqual({ id: 130, generation: 3 });
  for (const value of ["", "130", "0:1", "1:-1", "1:2:3", "9007199254740992:1", "2147483648:1", "1:4294967296", "1:4294967297"]) expect(parseScriptObjectHandle(value).isErr()).toBe(true);
});

it("accepts legacy snapshots without new diagnostics", () => {
  const snapshot = { ...inspectorFixture, runtime: { ...inspectorFixture.runtime, diagnostics: undefined },
    commandRejections: undefined, callbackFailures: undefined };
  expect(scriptInspectorSchema.safeParse(snapshot).success).toBe(true);
});

it("bounds diagnostics and rejects malformed attribution before either inspector renders it", () => {
  const diagnostics = inspectorFixture.runtime.diagnostics;
  expect(diagnostics).toBeDefined();
  if (!diagnostics) return;
  expect(scriptDiagnosticsSchema.safeParse({ ...diagnostics, frame: { ...diagnostics.frame, level: -1 } }).success).toBe(true);
  const invalid = [
    { ...diagnostics, lastFailure: { ...diagnostics.lastFailure, kind: "unknown" } },
    { ...diagnostics, lastFailure: { ...diagnostics.lastFailure, message: "x".repeat(513) } },
    { ...diagnostics, lastFailure: { ...diagnostics.lastFailure, object: { id: 0, generation: 1 } } },
    { ...diagnostics, frame: { ...diagnostics.frame, instructions: -1 } },
    { ...diagnostics, frame: { ...diagnostics.frame, unattributedInstructions: -1 } },
    { ...diagnostics, frame: { ...diagnostics.frame, entries: Array.from({ length: 33 }, () => diagnostics.frame.entries[0]) } },
  ];
  for (const value of invalid) expect(scriptDiagnosticsSchema.safeParse(value).success).toBe(false);
});
