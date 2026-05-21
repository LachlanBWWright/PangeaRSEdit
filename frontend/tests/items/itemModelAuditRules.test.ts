import { describe, expect, it } from "vitest";
import { validateItemModelMapping } from "@/data/items/itemModelAuditRules";

describe("validateItemModelMapping", () => {
  it("flags undeclared param domains and missing semantic proofs", () => {
    const issues = validateItemModelMapping({
      modelFile: "Lawn_Models1.3dmf",
      modelPath: "models",
      modelIndex: 1,
      rotationParam: {
        paramIndex: 1,
        rotationType: {
          type: "Rotation",
          description: "Quarter turns",
          multiplier: "PI/2",
          divisions: 4,
        },
      },
      verificationStatus: "approximate",
      semanticCitations: [],
      modelParts: [
        {
          partId: "door",
          modelFile: "Lawn_Models1.3dmf",
          modelPath: "models",
          modelIndex: 1,
          rotationY: Math.PI / 2,
          citations: [],
        },
      ],
    });

    expect(
      issues.includes("Rotation mapping references an undeclared parameter domain."),
    ).toBe(true);
    expect(
      issues.includes('Model part "door" is missing a model-index citation.'),
    ).toBe(true);
    expect(
      issues.includes('Model part "door" is missing a rotation citation.'),
    ).toBe(true);
  });
});
