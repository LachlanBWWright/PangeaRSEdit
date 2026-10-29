import type { RuntimeTarget } from "./scriptingRuntimeLaunch.spec";

interface LocalMode {
  readonly level: number;
  readonly levelName: string;
  readonly mode: "race" | "battle" | "capture";
}

const localModes: readonly LocalMode[] = [
  { level: 3, levelName: "race1", mode: "race" },
  { level: 4, levelName: "race2", mode: "race" },
  { level: 5, levelName: "battle1", mode: "battle" },
  { level: 6, levelName: "battle2", mode: "battle" },
  { level: 7, levelName: "flag1", mode: "capture" },
  { level: 8, levelName: "flag2", mode: "capture" },
];

export function nanosaur2LocalPlayerTargets(targets: readonly RuntimeTarget[]): readonly RuntimeTarget[] {
  const base = targets.find((target) => target.id === "Nanosaur 2");
  if (!base) return [];
  return localModes.map(({ level, levelName, mode }) => ({
    ...base,
    id: `Nanosaur 2 ${levelName} local two players`,
    query: `level=${level}&players=2&terrainFile=/Data/Terrain/${levelName}.ter&deferStart=1`,
    fixture: {
      assetPath: base.fixture.assetPath,
      convertedAssetPath: base.fixture.convertedAssetPath,
      assetUrl: base.fixture.assetUrl,
      contextExpectations: { levelNum: level, mode, networked: false, levelName, playerCount: 2 },
      levelNum: level,
      terrainPath: `Data/Terrain/${levelName}.ter`,
      terrainUrl: `../../../../assets/nanosaur2/terrain/${levelName}.ter`,
      nativeProbeIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      nativeItems: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"],
      playerEggStateProbe: true,
      playerCaptureStateProbe: mode === "capture",
      playerCommandProbe: true,
      playerVelocityProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      manualStart: true,
      startSelector: "#play-btn",
      verifyMalformedAsset: false,
    },
  }));
}
