import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

export type ObjectVisual = ScriptCustomObjectDefinition["visual"];
export type ObjectVisualKind = ObjectVisual["kind"];

export function createObjectVisual(kind: ObjectVisualKind, gameId: string): ObjectVisual {
  const common = { scale: 1, slot: 450 };
  switch (kind) {
    case "nativeDisplayGroup": return { kind, group: "global", modelObject: 0, ...common };
    case "customDisplayGroup": return { kind, modelPath: gameId === "MightyMike-Android" ? "Data/Scripts/assets/models/custom.shapes" : "Data/Scripts/assets/models/custom.bg3d", modelObject: 0, ...common };
    case "nativeSkeleton": return { kind, skeletonType: 0, initialAnimation: 0, animationSpeed: 1, ...common };
    case "customSkeleton": return { kind, modelPath: "Data/Scripts/assets/skeletons/custom.bg3d", skeletonPath: "Data/Scripts/assets/skeletons/custom.skeleton", animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1, ...common };
    case "none": return { kind };
  }
}
