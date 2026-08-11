import { describe, expect, it } from "vitest";
import { preflightScriptSource } from "@/editor/subviews/scripts/scriptSourcePreflight";

describe("preflightScriptSource", () => {
  it("reports unsupported hooks and unknown native IDs", () => {
    const findings = preflightScriptSource(
      "function onRaceStart()\nend\npangea.spawn.native(999, { x = 0, y = 0, z = 0 })",
      "OttoMatic-Android",
      ["onLevelStart"],
    );

    expect(findings).toEqual([
      { line: 1, message: "Hook 'onRaceStart' is not supported by Otto Matic." },
      { line: 3, message: "Unknown native item ID '999' for Otto Matic." },
    ]);
  });

  it("accepts numeric and named native IDs", () => {
    const findings = preflightScriptSource(
      "pangea.spawn.native(6, pos)\npangea.spawn.native('ottomatic.powerupPod', pos)",
      "OttoMatic-Android",
      [],
    );

    expect(findings).toEqual([]);
  });

  it("validates literal native parameter values", () => {
    const findings = preflightScriptSource(
      "pangea.spawn.native(6, pos, { param0 = 999 })",
      "OttoMatic-Android",
      [],
    );

    expect(findings).toEqual([{ line: 1, message: "param0 must fit the native terrain byte range 0-255." }]);
  });

  it("reports level restrictions and obvious unbounded loops", () => {
    const findings = preflightScriptSource(
      "pangea.spawn.native(1, pos)\nwhile true do\nend",
      "OttoMatic-Android",
      [],
      2,
    );

    expect(findings).toEqual([
      { line: 1, message: "1: Basic Plant requires Otto Matic level 1; the current level is 2." },
      { line: 2, message: "Unbounded 'while true' loop may exhaust the per-frame script budget." },
    ]);
  });
});
