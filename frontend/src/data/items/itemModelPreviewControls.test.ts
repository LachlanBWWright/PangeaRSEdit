import { describe, expect, it } from "vitest";
import { getItemModelParameterControls, setItemModelBit } from "./itemModelPreviewControls";

describe("item model preview controls", () => {
  it("derives controls from parameter domains", () => {
    const controls = getItemModelParameterControls({
      modelFile: "model.bg3d",
      modelPath: "models",
      modelIndex: 0,
      paramDomains: {
        p0: { kind: "enum", summary: "Variant", values: [{ value: 0, label: "Default" }] },
        flags: { kind: "bitset", summary: "Flags", bits: [{ index: 1, label: "Enabled" }] },
      },
    }, { p0: 0, p1: 0, p2: 0, p3: 0 }, 2);
    expect(controls.map((control) => control.key)).toEqual(["p0", "flags"]);
    expect(controls[1]?.value).toBe(2);
  });

  it("sets and clears named bits", () => {
    expect(setItemModelBit(0, 2, true)).toBe(4);
    expect(setItemModelBit(7, 1, false)).toBe(5);
  });
});
