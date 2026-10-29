import { expect, it, vi } from "vitest";
import { ScriptInspectorStream } from "../src/scriptInspectorStream";
import { inspectorFixture } from "../../packages/desktop-contracts/tests/scriptInspectorFixture";
import { scriptInspectorSchema } from "@pangea/desktop-contracts";

const frame = `[PangeaInspector] ${JSON.stringify(inspectorFixture)}\n`;

it("decodes a snapshot split at every stream boundary without leaking it into logs", () => {
  for (let split = 0; split <= frame.length; split++) {
    const receive = vi.fn();
    const stream = new ScriptInspectorStream(receive);
    expect(stream.feed(frame.slice(0, split)) + stream.feed(frame.slice(split)) + stream.finish()).toBe("");
    expect(receive).toHaveBeenCalledExactlyOnceWith(inspectorFixture);
  }
});

it("preserves ordinary, malformed, unsupported and incomplete output", () => {
  const receive = vi.fn();
  const stream = new ScriptInspectorStream(receive);
  expect(stream.feed("console without a newline")).toBe("console without a newline");
  const malformed = '[PangeaInspector] {oops}\n[PangeaInspector] {"version":2}\n';
  expect(stream.feed(malformed)).toBe(malformed);
  expect(stream.feed("[PangeaIn")).toBe("");
  expect(stream.finish()).toBe("[PangeaIn");
  expect(receive).not.toHaveBeenCalled();
});

it("bounds pending output and handles consecutive frames alongside real errors", () => {
  const receive = vi.fn();
  const stream = new ScriptInspectorStream(receive);
  const oversized = `[PangeaInspector] ${"x".repeat(262144)}`;
  expect(stream.feed(oversized)).toBe(oversized);
  expect(stream.feed(`\n${frame}Data/Scripts/dist/enemy.lua:12: failure\n${frame}`))
    .toBe("\nData/Scripts/dist/enemy.lua:12: failure\n");
  expect(receive).toHaveBeenCalledTimes(2);
});

it("rejects oversized state, object collections and invalid handles at the transport boundary", () => {
  expect(scriptInspectorSchema.safeParse(inspectorFixture).success).toBe(true);
  expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, objects: Array.from({ length: 65 }, () => inspectorFixture.objects[0]) }).success).toBe(false);
  expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, runtime: { ...inspectorFixture.runtime, timers: -1 } }).success).toBe(false);
  const object = inspectorFixture.objects[0];
  expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, objects: [{ ...object, id: 0 }] }).success).toBe(false);
  expect(scriptInspectorSchema.safeParse({ ...inspectorFixture, objects: [{ ...object, state: { note: "x".repeat(257) } }] }).success).toBe(false);
});

it("reassembles nested state replies without exposing protocol frames in logs", () => {
  const page = { entries: [{ key: "self", type: "table", value: "table", expandable: false, cycle: true, truncated: false }], offset: 0, nextOffset: null, total: 1, truncated: false, error: null };
  const stateFrame = `[PangeaInspectorState] ${JSON.stringify({ sequence: 17, page })}\n`;
  for (let split = 0; split <= stateFrame.length; split++) {
    const receive = vi.fn();
    const stream = new ScriptInspectorStream(() => undefined, receive);
    expect(stream.feed(stateFrame.slice(0, split)) + stream.feed(stateFrame.slice(split)) + stream.finish()).toBe("");
    expect(receive).toHaveBeenCalledExactlyOnceWith(17, page);
  }
});

it("preserves large selected-object resource replies across chunks and bounds oversized replies", () => {
  const page = { objects: [{ state: { escaped: "\u0001".repeat(60000) } }], error: null };
  const objectFrame = `[PangeaInspectorPage] ${JSON.stringify({ sequence: 18, page })}\n`;
  expect(objectFrame.length).toBeGreaterThan(270000);
  const receive = vi.fn();
  const stream = new ScriptInspectorStream(() => undefined, receive);
  expect(stream.feed(objectFrame.slice(0, 280000))).toBe("");
  expect(stream.feed(objectFrame.slice(280000)) + stream.finish()).toBe("");
  expect(receive).toHaveBeenCalledExactlyOnceWith(18, page);
  const oversized = `[PangeaInspectorPage] ${"x".repeat(1048576 + 256)}`;
  expect(stream.feed(oversized)).toBe(oversized);
});
