import type { MetadataControl, MetadataRule, MetadataRuleGroup } from "./levelMetadataRules";

type RuleFactory = (
  key: string, label: string, description: string, value: string, source: string,
  control: MetadataControl, defaultValue?: string, group?: MetadataRuleGroup,
  groupRole?: "preset" | "determined",
) => MetadataRule;

const trackProfiles = ["desert", "jungle", "ice", "crete", "china", "egypt", "europe", "scandinavia", "atlantis"];
const waterFirstHeights: Readonly<Record<string, number>> = { jungle: 700, crete: 600, egypt: 250 };
const beamDimensions: Readonly<Record<string, readonly [number, number]>> = {
  desert: [2490, 422], ice: [1825, 255], china: [1806, 354],
  egypt: [1751, 220], europe: [1498, 423], scandinavia: [1920, 280],
};

function profileControl(
  profiles: readonly string[], effect: string, custom = false,
): MetadataControl {
  const options = ["source-default", ...profiles, ...(custom ? ["custom"] : [])];
  return {
    kind: "select", options,
    optionLabels: { ...Object.fromEntries(profiles.map((profile) => [profile, profile.charAt(0).toUpperCase() + profile.slice(1)])),
      "source-default": "Original track behavior", custom: "Custom values" },
    optionDescriptions: Object.fromEntries(options.map((profile) => [profile,
      profile === "source-default" ? `Keep the original track selection for ${effect}.` :
      profile === "custom" ? `Use the individual values below for ${effect}.` :
      `Use the ${profile} profile for ${effect}.`,
    ])),
  };
}

function waterValues(profile: string): Readonly<Record<string, string>> {
  return Object.fromEntries(Array.from({ length: 6 }, (_, index) => [
    `track.waterHeight${index}`, String(index === 0 ? waterFirstHeights[profile] ?? 0 : 0),
  ]));
}

function beamValues(profile: string): Readonly<Record<string, string>> {
  const [offset, radius] = beamDimensions[profile] ?? beamDimensions.desert ?? [2490, 422];
  return { "track.startLineBeamOffset": String(offset), "track.startLineBeamRadius": String(radius) };
}

export function getCroMagItemMetadataRules(levelIndex: number, createRule: RuleFactory): readonly MetadataRule[] {
  const profile = trackProfiles[levelIndex] ?? "desert";
  const waterGroup: MetadataRuleGroup = {
    id: "croMagWaterHeights", label: "Fixed water heights", presetKey: "track.waterHeights",
    determinedValues: { ...Object.fromEntries(trackProfiles.map((track) => [track, waterValues(track)])),
      "source-default": waterValues(profile) },
  };
  const beamGroup: MetadataRuleGroup = {
    id: "croMagStartLineDimensions", label: "Starting-line dimensions", presetKey: "track.startLineDimensions",
    determinedValues: { ...Object.fromEntries(Object.keys(beamDimensions).map((track) => [track, beamValues(track)])),
      "source-default": beamValues(profile) },
  };
  const heights = waterValues(profile);
  const dimensions = beamValues(profile);
  return [
    createRule("track.tree", "Tree style", "Choose the tree model family and matching billboard behavior independently from the destination track. Unsupported subtypes use the selected family's first variant.",
      "source-default", "Items/Items.c:297-356", profileControl(["jungle", "ice", "crete", "europe", "scandinavia", "aztec"], "tree models and billboard behavior")),
    createRule("track.pillar", "Pillar style", "Choose the pillar model family and matching horizontal and vertical collision dimensions independently from the destination track.",
      "source-default", "Items/Items.c:459-575", profileControl(["desert", "crete", "egypt", "scandinavia", "atlantis", "coliseum"], "pillar models and collision dimensions")),
    createRule("track.statue", "Statue style", "Choose the statue model family and matching rotated collision behavior independently from the destination track.",
      "source-default", "Items/Items.c:575-635", profileControl(["crete", "egypt"], "statue models and collision")),
    createRule("track.house", "House style", "Choose the house model family and matching backface and height settings independently from the destination track.",
      "source-default", "Items/Items.c:1060-1140", profileControl(["jungle", "ice", "crete", "china", "europe", "scandinavia", "atlantis"], "house models and tuning")),
    createRule("track.boat", "Boat style", "Choose the boat model family and its matching asset bank independently from the destination track and gameplay mode.",
      "source-default", "Items/Items.c:635-740", profileControl(["egypt", "crete", "scandinavia", "atlantis"], "boat models")),
    createRule("track.rockOverhang", "Rock overhang style", "Choose the rock-overhang model family and matching asset bank independently from the destination track.",
      "source-default", "Items/Items.c:1150-1200", profileControl(["desert", "ice"], "rock overhangs")),
    createRule("track.waterHeights", "Fixed water height preset", "Choose the six fixed water heights used by authored water patches and floating boats. Terrain-relative water patches still follow their authored terrain settings.",
      "source-default", "Terrain/Liquids.c:40-52,118-140", profileControl(trackProfiles, "fixed water heights", true),
      "source-default", waterGroup, "preset"),
    ...Array.from({ length: 6 }, (_, index) => {
      const key = `track.waterHeight${index}`;
      return createRule(key, `Water height ${index + 1}`, `Set fixed water height slot ${index + 1} in native world units. This value is active when the fixed water height preset is Custom values.`,
        heights[key] ?? "0", "Terrain/Liquids.c:40-52,118-140", { kind: "slider", min: -10000, max: 10000, step: 10 },
        heights[key] ?? "0", waterGroup, "determined");
    }),
    createRule("track.startLineDimensions", "Starting-line dimension preset", "Choose bridge beam collision dimensions independently from the starting-line collision style, movement, and visual model.",
      "source-default", "Items/Items.c:150-263", profileControl(Object.keys(beamDimensions), "bridge collision dimensions", true),
      "source-default", beamGroup, "preset"),
    createRule("track.startLineBeamOffset", "Bridge beam offset", "Set the non-negative distance from the starting-line center to each bridge beam. Active with Custom starting-line dimensions.",
      dimensions["track.startLineBeamOffset"] ?? "2490", "Items/Items.c:150-263", { kind: "slider", min: 0, max: 10000, step: 1 },
      dimensions["track.startLineBeamOffset"] ?? "2490", beamGroup, "determined"),
    createRule("track.startLineBeamRadius", "Bridge beam radius", "Set the positive radius of each bridge beam collision box. Active with Custom starting-line dimensions.",
      dimensions["track.startLineBeamRadius"] ?? "422", "Items/Items.c:150-263", { kind: "slider", min: 1, max: 2000, step: 1 },
      dimensions["track.startLineBeamRadius"] ?? "422", beamGroup, "determined"),
  ];
}
