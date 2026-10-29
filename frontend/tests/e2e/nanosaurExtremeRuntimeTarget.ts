import type { RuntimeTarget } from "./scriptingRuntimeLaunch.spec";

export function nanosaurExtremeRuntimeTargets(
  baseTargets: readonly RuntimeTarget[],
): RuntimeTarget[] {
  const base = baseTargets.find((target) => target.id === "Nanosaur");
  if (!base) return [];

  return [{
    id: "Nanosaur extreme",
    path: base.path,
    requiresStartup: base.requiresStartup,
    query: "level=0&extreme=1",
    fixture: {
      assetPath: base.fixture.assetPath,
      assetUrl: base.fixture.assetUrl,
      nativeProbeIds: [],
      nativeItems: [],
      levelNum: 0,
      contextExpectations: {
        levelNum: 0,
        levelName: "level1",
        networked: false,
      },
      terrainPath: "Data/Terrain/Level1Pro.ter",
      terrainUrl: "../../../../assets/nanosaur/terrain/Level1Pro.ter",
      playerStateProbe: true,
      playerEggStateProbe: true,
      lifecycleProbe: true,
      scriptedObjectProbe: true,
      verifyMalformedAsset: true,
    },
  }];
}
