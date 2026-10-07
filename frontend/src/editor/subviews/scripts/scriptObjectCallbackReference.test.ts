import { describe, expect, it } from "vitest";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { getObjectCallbackReferences } from "./scriptObjectCallbackReference";

describe("item callback reference", () => {
  it("documents every lifecycle handler with its object context and ignored return value", () => {
    const entries = getObjectCallbackReferences([], "");
    expect(entries.map((entry) => entry.name)).toEqual(SCRIPTING_CONTRACT.objectEvents.map((event) => event.handler));
    expect(entries.every((entry) => entry.returnType === "nil")).toBe(true);
    expect(entries.find((entry) => entry.name === "onAnimationEvent")?.fields.eventValue).toBe("integer");
    expect(entries.find((entry) => entry.name === "onAnimationComplete")?.fields.eventValue).toBeUndefined();
  });

  it("distinguishes effect-producing onTrigger from contact lifecycle notifications", () => {
    const entries = getObjectCallbackReferences(["onTriggerEnter", "onDamage"], "");
    expect(entries.find((entry) => entry.name === "onTrigger")?.returnType).toBe("TriggerResult|nil");
    expect(entries.find((entry) => entry.name === "onTriggerEnter")?.returnType).toBe("nil");
    expect(entries.find((entry) => entry.name === "onDamage")?.returnType).toBe("DamageResult|nil");
    expect(entries.find((entry) => entry.name === "onPickupCollected")).toBeUndefined();
  });

  it("searches names, context fields and result effects case-insensitively", () => {
    expect(getObjectCallbackReferences([], " DELTASECONDS ").map((entry) => entry.name)).toContain("onUpdate");
    expect(getObjectCallbackReferences(["onTriggerEnter"], "healthDelta").map((entry) => entry.name)).toEqual(["onTrigger"]);
    expect(getObjectCallbackReferences([], "animation marker").map((entry) => entry.name)).toContain("onAnimationEvent");
  });
});
