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

  it("does not accept a proof scoped to a different model part", () => {
    const issues = validateItemModelMapping({
      modelFile: "BeeHive_Models.3dmf",
      modelPath: "models",
      modelIndex: 9,
      verificationStatus: "verified",
      semanticCitations: [
        {
          file: "src/Items/Triggers.c",
          line: 603,
          description: "AddDetonator routine",
          proves: "item-add-routine",
        },
      ],
      modelParts: [
        {
          partId: "plunger",
          modelFile: "BeeHive_Models.3dmf",
          modelPath: "models",
          modelIndex: 9,
          citations: [
            {
              partId: "box",
              file: "src/Items/Triggers.c",
              line: 625,
              description: "Box model type",
              proves: "model-index",
            },
          ],
        },
      ],
    });

    expect(issues).toContain(
      'Model part "plunger" is missing a model-index citation.',
    );
  });
});
