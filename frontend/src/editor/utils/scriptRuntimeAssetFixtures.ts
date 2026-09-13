import { Game } from "../../data/globals/globals";

export interface ScriptRuntimeAssetFixture {
  readonly game: Game;
  readonly terrainDataPath: string | null;
  readonly terrainRsrcPath: string | null;
  readonly terrainTexturePath: string | null;
  readonly customAssets: readonly {
    readonly path: string;
    readonly sourcePath: string;
  }[];
}

/**
 * Production bytes used by the editor preview and the non-Android artifact
 * gate. Keeping this list outside a single test prevents a new game from
 * receiving only a mocked VFS fixture.
 */
export const SCRIPT_RUNTIME_ASSET_FIXTURES: readonly ScriptRuntimeAssetFixture[] = [
  {
    game: Game.OTTO_MATIC,
    terrainDataPath: "assets/ottoMatic/terrain/EarthFarm.ter",
    terrainRsrcPath: "assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
        sourcePath: "games/ottomatic/skeletons/Blob.bg3d",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/ottomatic/skeletons/Blob.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.NANOSAUR,
    terrainDataPath: "assets/nanosaur/terrain/Level1.ter",
    terrainRsrcPath: null,
    terrainTexturePath: "assets/nanosaur/terrain/Level1.trt",
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.3dmf",
        sourcePath: "games/nanosaur1/skeletons/Rex.3dmf",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/nanosaur1/skeletons/Rex.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.BUGDOM,
    terrainDataPath: null,
    terrainRsrcPath: "assets/bugdom/terrain/Training.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.3dmf",
        sourcePath: "games/bugdom1/skeletons/FireFly.3dmf",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/bugdom1/skeletons/FireFly.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.BUGDOM_2,
    terrainDataPath: "assets/bugdom2/terrain/Level1_Garden.ter",
    terrainRsrcPath: "assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
        sourcePath: "games/bugdom2/skeletons/Mouse.bg3d",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/bugdom2/skeletons/Mouse.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.CRO_MAG,
    terrainDataPath: "assets/croMag/terrain/StoneAge_Desert.ter",
    terrainRsrcPath: "assets/croMag/terrain/StoneAge_Desert.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
        sourcePath: "games/cromagrally/skeletons/GragStanding.bg3d",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/cromagrally/skeletons/GragStanding.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.BILLY_FRONTIER,
    terrainDataPath: "assets/billyFrontier/terrain/town_duel.ter",
    terrainRsrcPath: "assets/billyFrontier/terrain/town_duel.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
        sourcePath: "games/billyfrontier/skeletons/Billy.bg3d",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/billyfrontier/skeletons/Billy.skeleton.rsrc",
      },
    ],
  },
  {
    game: Game.MIGHTY_MIKE,
    terrainDataPath: "assets/mightyMike/terrain/jurassic.map-1",
    terrainRsrcPath: null,
    terrainTexturePath: "assets/mightyMike/terrain/jurassic.tileset",
    customAssets: [
      {
        path: "Data/Scripts/assets/shapes/production-fixture.shapes",
        sourcePath: "data/mightymike/shapes/main.shapes",
      },
    ],
  },
  {
    game: Game.NANOSAUR_2,
    terrainDataPath: "assets/nanosaur2/terrain/level1.ter",
    terrainRsrcPath: "assets/nanosaur2/terrain/level1.ter.rsrc",
    terrainTexturePath: null,
    customAssets: [
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.bg3d",
        sourcePath: "games/nanosaur2/skeletons/bonusworm.bg3d",
      },
      {
        path: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
        sourcePath: "games/nanosaur2/skeletons/bonusworm.skeleton.rsrc",
      },
    ],
  },
];
