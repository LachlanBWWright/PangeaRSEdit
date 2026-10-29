import { expect, it } from "vitest";
import { scriptInspectorSchema } from "@pangea/desktop-contracts";
import { inspectorFixture } from "../../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { nativeMilliseconds } from "./ScriptNativePerformance";
import { groupNativeCosts } from "./scriptNativeCostGroups";

const frame = { level: -1, frame: 0, calls: 1, milliseconds: 2.5,
  operations: [{ operation: "world.rayCast", calls: 1, milliseconds: 2.5,
    maxMilliseconds: 2.5, slowCalls: 1, source: "main.lua", object: null }] };

it("validates measured native costs independently of Lua instruction diagnostics", () => {
  expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, nativeCosts: { current: frame, previous: frame } }).success).toBe(true);
  expect(scriptInspectorSchema.safeParse(inspectorFixture).success).toBe(true);
  for (const invalid of [
    { ...frame, milliseconds: -1 }, { ...frame, milliseconds: Infinity },
    { ...frame, calls: 0.5 },
    { ...frame, operations: [{ ...frame.operations[0], maxMilliseconds: -1 }] },
    { ...frame, operations: [{ ...frame.operations[0], slowCalls: -1 }] },
    { ...frame, operations: [{ ...frame.operations[0], object: { id: 0, generation: 1 } }] },
    { ...frame, operations: Array.from({ length: 33 }, () => frame.operations[0]) },
  ]) expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, nativeCosts: { current: invalid, previous: frame } }).success).toBe(false);
});

it("keeps small measured durations visible with explicit milliseconds", () => {
  expect(nativeMilliseconds(0)).toBe("0.000 ms");
  expect(nativeMilliseconds(0.0001)).toBe("<0.001 ms");
  expect(nativeMilliseconds(4.25)).toBe("4.250 ms");
});

it("aggregates scripts across objects while preserving full object generations", () => {
  const entries = [
    { source: "enemy.lua", object: { id: 1, generation: 1 }, calls: 2, milliseconds: 3, maxMilliseconds: 2, slowCalls: 1 },
    { source: "enemy.lua", object: { id: 1, generation: 2 }, calls: 1, milliseconds: 5, maxMilliseconds: 5, slowCalls: 1 },
    { source: "level.lua", object: null, calls: 1, milliseconds: 0.5, maxMilliseconds: 0.5, slowCalls: 0 },
  ];
  expect(groupNativeCosts(entries, "script")[0]).toEqual({ label: "enemy.lua", calls: 3, milliseconds: 8, maxMilliseconds: 5, slowCalls: 2 });
  expect(groupNativeCosts(entries, "object").map((entry) => entry.label)).toEqual(["Object 1:2", "Object 1:1", "No object (level/global callbacks)"]);
});

it("validates bounded rolling history while accepting older runtimes", () => {
  const window = { capacity: 60, frames: 1, level: 0, calls: 1, milliseconds: 2.5, maxMilliseconds: 2.5, slowCalls: 1,
    history: [{ frame: 1, calls: 1, milliseconds: 2.5, maxMilliseconds: 2.5, slowCalls: 1 }],
    entries: [{ source: "enemy.lua", object: { id: 1, generation: 2 }, calls: 1, milliseconds: 2.5, maxMilliseconds: 2.5, slowCalls: 1 }],
    truncated: false, sourceTruncated: false, unattributedCalls: 0, unattributedMilliseconds: 0 };
  function parse(candidate: unknown) {
    return scriptInspectorSchema.safeParse({ ...inspectorFixture, nativeCosts: { current: frame, previous: frame, window: candidate } }).success;
  }
  expect(parse(window)).toBe(true);
  expect(parse({ ...window, frames: 61 })).toBe(false);
  expect(parse({ ...window, entries: Array.from({ length: 65 }, () => window.entries[0]) })).toBe(false);
  expect(parse({ ...window, history: Array.from({ length: 61 }, () => window.history[0]) })).toBe(false);
  expect(parse({ ...window, unattributedMilliseconds: -1 })).toBe(false);
});
