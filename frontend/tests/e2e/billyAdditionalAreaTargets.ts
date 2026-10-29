import type { RuntimeTarget } from "./scriptingRuntimeLaunch.spec";

interface BillyArea {
  readonly area: number;
  readonly name: string;
  readonly mode: "duel" | "shootout" | "stampede" | "targetPractice";
  readonly terrain?: string;
}

const additionalAreas: readonly BillyArea[] = [
  { area: 2, name: "Town Duel 2", mode: "duel", terrain: "town_duel" },
  { area: 4, name: "Town Duel 3", mode: "duel", terrain: "town_duel" },
  { area: 6, name: "Swamp Duel 1", mode: "duel", terrain: "swamp_duel" },
  { area: 7, name: "Swamp Shootout", mode: "shootout", terrain: "swamp_shootout" },
  { area: 8, name: "Swamp Duel 2", mode: "duel", terrain: "swamp_duel" },
  { area: 9, name: "Swamp Stampede", mode: "stampede", terrain: "swamp_stampede" },
  { area: 10, name: "Swamp Duel 3", mode: "duel", terrain: "swamp_duel" },
  { area: 11, name: "Target Practice 2", mode: "targetPractice" },
];

export function createBillyAdditionalAreaTargets(
  baseTargets: readonly RuntimeTarget[],
): RuntimeTarget[] {
  const base = baseTargets.find((target) => target.id === "Billy Frontier");
  if (!base) return [];
  return additionalAreas.map((area) => ({
    ...base,
    id: `Billy Frontier ${area.name}`,
    query: `level=${area.area}`,
    fixture: {
      ...base.fixture,
      levelNum: area.area,
      contextExpectations: {
        levelNum: area.area,
        mode: area.mode,
        networked: false,
      },
      nativeProbeIds: [],
      nativeItems: [],
      playerCommandProbe: false,
      playerVelocityProbe: false,
      playerStateProbe: true,
      modeStateProbe: true,
      lifecycleProbe: true,
      objectCommandProbe: true,
      scriptedObjectProbe: true,
      recreationProbe: false,
      replacementLifecycleProbe: false,
      saveLoadProbe: false,
      areaCompletionProbe: false,
      terrainReplacement: undefined,
      terrainReplacementProbe: undefined,
      terrainReplacementProbes: undefined,
      terrainPath: area.terrain ? `Data/Terrain/${area.terrain}.ter` : undefined,
      terrainUrl: area.terrain
        ? `../../../../assets/billyFrontier/terrain/${area.terrain}.ter`
        : undefined,
      verifyMalformedAsset: false,
    },
  }));
}
