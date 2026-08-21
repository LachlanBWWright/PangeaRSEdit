import { Game } from "../../data/globals/globals";

export interface ScriptRuntimeAssetFixture {
  readonly game: Game;
  readonly terrainDataPath: string | null;
  readonly terrainRsrcPath: string | null;
  readonly terrainTexturePath: string | null;
  readonly customAssetPath: string;
  readonly customAssetSourcePath: string;
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
    customAssetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    customAssetSourcePath: "games/ottomatic/skeletons/GiantLizard.bg3d",
  },
  {
    game: Game.NANOSAUR,
    terrainDataPath: "assets/nanosaur/terrain/Level1.ter",
    terrainRsrcPath: null,
    terrainTexturePath: "assets/nanosaur/terrain/Level1.trt",
    customAssetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    customAssetSourcePath: "games/nanosaur1/skeletons/Rex.skeleton.rsrc",
  },
  {
    game: Game.BUGDOM,
    terrainDataPath: null,
    terrainRsrcPath: "assets/bugdom/terrain/Training.ter.rsrc",
    terrainTexturePath: null,
    customAssetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    customAssetSourcePath: "games/bugdom1/skeletons/FireFly.skeleton.rsrc",
  },
  {
    game: Game.BUGDOM_2,
    terrainDataPath: "assets/bugdom2/terrain/Level1_Garden.ter",
    terrainRsrcPath: "assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
    terrainTexturePath: null,
    customAssetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    customAssetSourcePath: "games/bugdom2/skeletons/Mouse.bg3d",
  },
  {
    game: Game.CRO_MAG,
    terrainDataPath: "assets/croMag/terrain/StoneAge_Desert.ter",
    terrainRsrcPath: "assets/croMag/terrain/StoneAge_Desert.ter.rsrc",
    terrainTexturePath: null,
    customAssetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    customAssetSourcePath: "games/cromagrally/skeletons/GragStanding.bg3d",
  },
  {
    game: Game.BILLY_FRONTIER,
    terrainDataPath: "assets/billyFrontier/terrain/town_duel.ter",
    terrainRsrcPath: "assets/billyFrontier/terrain/town_duel.ter.rsrc",
    terrainTexturePath: null,
    customAssetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    customAssetSourcePath: "games/billyfrontier/skeletons/Billy.skeleton.rsrc",
  },
  {
    game: Game.MIGHTY_MIKE,
    terrainDataPath: "assets/mightyMike/terrain/jurassic.map-1",
    terrainRsrcPath: null,
    terrainTexturePath: "assets/mightyMike/terrain/jurassic.tileset",
    customAssetPath: "Data/Scripts/assets/shapes/production-fixture.shapes",
    customAssetSourcePath: "data/mightymike/shapes/main.shapes",
  },
  {
    game: Game.NANOSAUR_2,
    terrainDataPath: "assets/nanosaur2/terrain/level1.ter",
    terrainRsrcPath: "assets/nanosaur2/terrain/level1.ter.rsrc",
    terrainTexturePath: null,
    customAssetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    customAssetSourcePath: "games/nanosaur2/skeletons/bonusworm.bg3d",
  },
];
