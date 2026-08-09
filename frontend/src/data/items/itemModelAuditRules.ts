import type {
  ModelPartMapping,
  UniversalItemModelMapping,
} from "@/data/items/itemModelTypes";

function partHasProof(
  part: ModelPartMapping,
  proof: "model-index" | "scale" | "rotation" | "position",
): boolean {
  return part.citations.some(
    (citation) => citation.partId === part.partId && citation.proves === proof,
  );
}

function validateModelPart(part: ModelPartMapping): string[] {
  const issues: string[] = [];
  if (!partHasProof(part, "model-index")) {
    issues.push(`Model part "${part.partId}" is missing a model-index citation.`);
  }
  if (part.scale !== undefined && !partHasProof(part, "scale")) {
    issues.push(`Model part "${part.partId}" is missing a scale citation.`);
  }
  if (part.rotationY !== undefined && !partHasProof(part, "rotation")) {
    issues.push(`Model part "${part.partId}" is missing a rotation citation.`);
  }
  if (part.positionOffset !== undefined && !partHasProof(part, "position")) {
    issues.push(`Model part "${part.partId}" is missing a position citation.`);
  }
  return issues;
}

export function validateItemModelMapping(
  mapping: UniversalItemModelMapping | undefined,
): string[] {
  if (!mapping) {
    return ["No model mapping exists for this item type."];
  }

  const issues: string[] = [];
  if (mapping.verificationStatus !== "verified") {
    issues.push("Mapping is still approximate and not fully source-derived.");
  }
  if (
    (mapping.semanticCitations ?? []).length === 0 &&
    (mapping.citations ?? []).length === 0
  ) {
    issues.push("Mapping has no source citations.");
  }
  if (mapping.rotationParam && !mapping.paramDomains?.[`p${mapping.rotationParam.paramIndex}`]) {
    issues.push("Rotation mapping references an undeclared parameter domain.");
  }
  if (mapping.scaleParam && !mapping.paramDomains?.[`p${mapping.scaleParam.paramIndex}`]) {
    issues.push("Scale mapping references an undeclared parameter domain.");
  }
  if (mapping.variants && !mapping.paramDomains?.p0) {
    issues.push("Model variants exist without a declared p0 parameter domain.");
  }
  if (mapping.modelParts && mapping.modelParts.length > 0) {
    mapping.modelParts.forEach((part) => {
      issues.push(...validateModelPart(part));
    });
  } else if ((mapping.semanticCitations ?? []).length === 0) {
    issues.push("Single-part mapping has no semantic citations.");
  }

  return issues;
}
