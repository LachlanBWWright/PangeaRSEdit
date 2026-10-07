import { z } from "zod";

export const scriptNativeVisualGroupSchema = z.enum([
  "global", "levelSpecific", "global2", "levelSpecific2", "foliage",
  "lawn", "lawn2", "pond", "forest", "hive", "night", "anthill",
  "garden", "sidewalk", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park",
  "farm", "blob", "blob-boss", "apocalypse", "cloud", "jungle", "jungle-boss",
  "fire-ice", "saucer", "brain-boss", "desert", "ice", "crete", "china",
  "egypt", "europe", "scandinavia", "atlantis", "stonehenge", "aztec",
  "coliseum", "maze", "celtic", "tarpits", "spiral", "ramps", "swamp",
  "town", "targetPractice", "level0", "infobar", "weapons",
  "jurassic", "jurassic2", "candy", "candy2", "fairy", "fairy2",
  "clown", "clown2", "bargain", "bargain2",
]);

interface NativeVisualGroupOption {
  readonly value: z.infer<typeof scriptNativeVisualGroupSchema>;
  readonly label: string;
}

const commonGroups: readonly NativeVisualGroupOption[] = [
  { value: "global", label: "Global models" },
  { value: "levelSpecific", label: "Current level models" },
];

export function getNativeVisualGroupOptions(gameId: string): readonly NativeVisualGroupOption[] {
  if (gameId === "Bugdom-android") {
    return [
      ...commonGroups,
      { value: "global2", label: "Global models (second bank)" },
      { value: "levelSpecific2", label: "Current level models (second bank)" },
      { value: "lawn", label: "Lawn models" },
      { value: "lawn2", label: "Lawn models (second bank)" },
      { value: "pond", label: "Pond models" },
      { value: "forest", label: "Forest models" },
      { value: "hive", label: "Hive models" },
      { value: "night", label: "Night models" },
      { value: "anthill", label: "Anthill models" },
    ];
  }
  if (gameId === "Bugdom2-Android") {
    return [
      ...commonGroups,
      { value: "foliage", label: "Foliage models" },
      { value: "garden", label: "Garden models" },
      { value: "sidewalk", label: "Sidewalk models" },
      { value: "plumbing", label: "Plumbing models" },
      { value: "playroom", label: "Playroom models" },
      { value: "closet", label: "Closet models" },
      { value: "gutter", label: "Gutter models" },
      { value: "garbage", label: "Garbage models" },
      { value: "balsa", label: "Balsa models" },
      { value: "park", label: "Park models" },
    ];
  }
  if (gameId === "OttoMatic-Android") {
    return [
      ...commonGroups,
      { value: "farm", label: "Farm models" },
      { value: "blob", label: "Blob world models" },
      { value: "blob-boss", label: "Blob boss models" },
      { value: "apocalypse", label: "Apocalypse models" },
      { value: "cloud", label: "Cloud models" },
      { value: "jungle", label: "Jungle models" },
      { value: "jungle-boss", label: "Jungle boss models" },
      { value: "fire-ice", label: "Fire and ice models" },
      { value: "saucer", label: "Saucer models" },
      { value: "brain-boss", label: "Brain boss models" },
    ];
  }
  if (gameId === "CroMagRally-Android") {
    return [
      ...commonGroups,
      { value: "desert", label: "Desert models" },
      { value: "jungle", label: "Jungle models" },
      { value: "ice", label: "Ice models" },
      { value: "crete", label: "Crete models" },
      { value: "china", label: "China models" },
      { value: "egypt", label: "Egypt models" },
      { value: "europe", label: "Europe models" },
      { value: "scandinavia", label: "Scandinavia models" },
      { value: "atlantis", label: "Atlantis models" },
      { value: "stonehenge", label: "Stonehenge models" },
      { value: "aztec", label: "Aztec models" },
      { value: "coliseum", label: "Coliseum models" },
      { value: "maze", label: "Maze models" },
      { value: "celtic", label: "Celtic models" },
      { value: "tarpits", label: "Tar pits models" },
      { value: "spiral", label: "Spiral models" },
      { value: "ramps", label: "Ramps models" },
    ];
  }
  if (gameId === "BillyFrontier-Android") {
    return [
      ...commonGroups,
      { value: "town", label: "Town models" },
      { value: "swamp", label: "Swamp models" },
      { value: "targetPractice", label: "Target practice models" },
    ];
  }
  if (gameId === "Nanosaur2-Android") {
    return [
      ...commonGroups,
      { value: "forest", label: "Forest models" },
      { value: "desert", label: "Desert models" },
      { value: "swamp", label: "Swamp models" },
    ];
  }
  if (gameId === "Nanosaur-android") {
    return [
      ...commonGroups,
      { value: "level0", label: "Gameplay models" },
      { value: "infobar", label: "Infobar models" },
    ];
  }
  if (gameId === "MightyMike-Android") {
    return [
      ...commonGroups,
      { value: "levelSpecific2", label: "Current scene shapes (second bank)" },
      { value: "weapons", label: "Weapon shapes" },
      { value: "jurassic", label: "Jurassic shapes" },
      { value: "jurassic2", label: "Jurassic shapes (second bank)" },
      { value: "candy", label: "Candy shapes" },
      { value: "candy2", label: "Candy shapes (second bank)" },
      { value: "fairy", label: "Fairy shapes" },
      { value: "fairy2", label: "Fairy shapes (second bank)" },
      { value: "clown", label: "Clown shapes" },
      { value: "clown2", label: "Clown shapes (second bank)" },
      { value: "bargain", label: "Bargain shapes" },
      { value: "bargain2", label: "Bargain shapes (second bank)" },
    ];
  }
  return commonGroups;
}
