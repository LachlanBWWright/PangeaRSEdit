import type { RuntimeTarget } from "./scriptingRuntimeLaunch.spec";

interface Track {
  readonly number: number;
  readonly name: string;
  readonly terrain: string;
}

const raceTracks: readonly Track[] = [
  { number: 0, name: "desert", terrain: "StoneAge_Desert" },
  { number: 1, name: "jungle", terrain: "StoneAge_Jungle" },
  { number: 2, name: "ice", terrain: "StoneAge_Ice" },
  { number: 3, name: "crete", terrain: "BronzeAge_Crete" },
  { number: 4, name: "china", terrain: "BronzeAge_China" },
  { number: 5, name: "egypt", terrain: "BronzeAge_Egypt" },
  { number: 6, name: "europe", terrain: "IronAge_Europe" },
  { number: 7, name: "scandinavia", terrain: "IronAge_Scandinavia" },
  { number: 8, name: "atlantis", terrain: "IronAge_Atlantis" },
];

const battleTracks: readonly Track[] = [
  { number: 9, name: "stonehenge", terrain: "Battle_StoneHenge" },
  { number: 10, name: "aztec", terrain: "Battle_Aztec" },
  { number: 11, name: "coliseum", terrain: "Battle_Coliseum" },
  { number: 12, name: "maze", terrain: "Battle_Maze" },
  { number: 13, name: "celtic", terrain: "Battle_Celtic" },
  { number: 14, name: "tarpits", terrain: "Battle_TarPits" },
  { number: 15, name: "spiral", terrain: "Battle_Spiral" },
  { number: 16, name: "ramps", terrain: "Battle_Ramps" },
];

interface Mode {
  readonly query: string;
  readonly context: string;
  readonly existingTrack?: number;
}

const battleModes: readonly Mode[] = [
  { query: "capture", context: "capture", existingTrack: 9 },
  { query: "tag1", context: "tag1", existingTrack: 10 },
  { query: "tag2", context: "tag2" },
  { query: "survival", context: "survival", existingTrack: 11 },
];

function createModeTarget(base: RuntimeTarget, track: Track, mode: Mode): RuntimeTarget {
  return {
    ...base,
    id: `Cro-Mag Rally ${mode.query} ${track.name}`,
    query: `track=${track.number + 1}&car=1&mode=${mode.query}`,
    fixture: {
      assetPath: base.fixture.assetPath,
      convertedAssetPath: base.fixture.convertedAssetPath,
      assetUrl: base.fixture.assetUrl,
      nativeItems: [],
      nativeProbeIds: [],
      levelNum: track.number,
      contextExpectations: { mode: mode.context, networked: false, trackName: track.name },
      vehicleStateProbe: true,
      lifecycleProbe: true,
      recreationProbe: true,
      objectCommandProbe: true,
      terrainPath: `Data/Terrain/${track.terrain}.ter`,
      terrainUrl: `../../../../assets/croMag/terrain/${track.terrain}.ter`,
      verifyMalformedAsset: false,
    },
  };
}

export function createCroMagAdditionalModeTargets(baseTargets: readonly RuntimeTarget[]): RuntimeTarget[] {
  const base = baseTargets.find((target) => target.id === "Cro-Mag Rally");
  if (!base) return [];
  const race = raceTracks.map((track) => createModeTarget(base, track, {
    query: "race", context: "multiplayerRace",
  }));
  const battle = battleModes.flatMap((mode) => battleTracks
    .filter((track) => track.number !== mode.existingTrack)
    .map((track) => createModeTarget(base, track, mode)));
  return [...race, ...battle];
}
