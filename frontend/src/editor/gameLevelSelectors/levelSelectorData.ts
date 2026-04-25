import {
  Bugdom2Globals,
  CroMagGlobals,
  MightyMikeGlobals,
} from "@/data/globals/globals";

export interface NamedLevelPath {
  readonly label: string;
  readonly path: string;
}

export interface TitledLevelGroup {
  readonly title: string;
  readonly levels: readonly NamedLevelPath[];
}

export const CROMAG_LEVEL_GROUPS: readonly TitledLevelGroup[] = [
  {
    title: "Cro-Mag Races",
    levels: [
      { label: "Desert", path: "assets/croMag/terrain/StoneAge_Desert.ter" },
      { label: "Jungle", path: "assets/croMag/terrain/StoneAge_Jungle.ter" },
      { label: "Ice", path: "assets/croMag/terrain/StoneAge_Ice.ter" },
      { label: "Crete", path: "assets/croMag/terrain/BronzeAge_Crete.ter" },
      { label: "China", path: "assets/croMag/terrain/BronzeAge_China.ter" },
      { label: "Egypt", path: "assets/croMag/terrain/BronzeAge_Egypt.ter" },
      { label: "Europe", path: "assets/croMag/terrain/IronAge_Europe.ter" },
      {
        label: "Scandinavia",
        path: "assets/croMag/terrain/IronAge_Scandinavia.ter",
      },
      { label: "Atlantis", path: "assets/croMag/terrain/IronAge_Atlantis.ter" },
    ],
  },
  {
    title: "Cro-Mag Battles",
    levels: [
      { label: "Aztec", path: "assets/croMag/terrain/Battle_Aztec.ter" },
      { label: "Celtic", path: "assets/croMag/terrain/Battle_Celtic.ter" },
      { label: "Coliseum", path: "assets/croMag/terrain/Battle_Coliseum.ter" },
      { label: "Maze", path: "assets/croMag/terrain/Battle_Maze.ter" },
      { label: "Ramps", path: "assets/croMag/terrain/Battle_Ramps.ter" },
      { label: "Spiral", path: "assets/croMag/terrain/Battle_Spiral.ter" },
      {
        label: "Stonehenge",
        path: "assets/croMag/terrain/Battle_StoneHenge.ter",
      },
      { label: "Tar Pits", path: "assets/croMag/terrain/Battle_TarPits.ter" },
    ],
  },
];

export const MIGHTYMIKE_LEVELS: readonly NamedLevelPath[] = [
  {
    label: "Prehistoric Plaza 1",
    path: "assets/mightyMike/terrain/jurassic.map-1",
  },
  {
    label: "Prehistoric Plaza 2",
    path: "assets/mightyMike/terrain/jurassic.map-2",
  },
  {
    label: "Prehistoric Plaza 3",
    path: "assets/mightyMike/terrain/jurassic.map-3",
  },
  { label: "Candy Cane Lane 1", path: "assets/mightyMike/terrain/candy.map-1" },
  { label: "Candy Cane Lane 2", path: "assets/mightyMike/terrain/candy.map-2" },
  { label: "Candy Cane Lane 3", path: "assets/mightyMike/terrain/candy.map-3" },
  {
    label: "Fairy Tale Trail 1",
    path: "assets/mightyMike/terrain/fairy.map-1",
  },
  {
    label: "Fairy Tale Trail 2",
    path: "assets/mightyMike/terrain/fairy.map-2",
  },
  {
    label: "Fairy Tale Trail 3",
    path: "assets/mightyMike/terrain/fairy.map-3",
  },
  { label: "Magic Funhouse 1", path: "assets/mightyMike/terrain/clown.map-1" },
  { label: "Magic Funhouse 2", path: "assets/mightyMike/terrain/clown.map-2" },
  { label: "Magic Funhouse 3", path: "assets/mightyMike/terrain/clown.map-3" },
  { label: "Bargain Bin 1", path: "assets/mightyMike/terrain/bargain.map-1" },
  { label: "Bargain Bin 2", path: "assets/mightyMike/terrain/bargain.map-2" },
  { label: "Bargain Bin 3", path: "assets/mightyMike/terrain/bargain.map-3" },
];

export const BUGDOM2_STANDARD_LEVELS: readonly NamedLevelPath[] = [
  { label: "Level 1", path: "assets/bugdom2/terrain/Level1_Garden.ter" },
  { label: "Level 2", path: "assets/bugdom2/terrain/Level2_SideWalk.ter" },
  { label: "Level 3", path: "assets/bugdom2/terrain/Level3_DogHair.ter" },
  { label: "Level 5", path: "assets/bugdom2/terrain/Level5_Playroom.ter" },
  { label: "Level 6", path: "assets/bugdom2/terrain/Level6_Closet.ter" },
  { label: "Level 8", path: "assets/bugdom2/terrain/Level8_Garbage.ter" },
  { label: "Level 9", path: "assets/bugdom2/terrain/Level9_Balsa.ter" },
  { label: "Level 10", path: "assets/bugdom2/terrain/Level10_Park.ter" },
];

export const BUGDOM2_TUNNEL_LEVELS: readonly {
  readonly label: string;
  readonly fileName: string;
  readonly path: string;
}[] = [
  {
    label: "Level 4 (Tunnel)",
    path: "games/bugdom2/tunnels/Plumbing.tun",
    fileName: "Plumbing.tun",
  },
  {
    label: "Level 7 (Tunnel)",
    path: "games/bugdom2/tunnels/Gutter.tun",
    fileName: "Gutter.tun",
  },
];

export const LEVEL_SELECTOR_GLOBALS = {
  bugdom2: Bugdom2Globals,
  croMag: CroMagGlobals,
  mightyMike: MightyMikeGlobals,
};
