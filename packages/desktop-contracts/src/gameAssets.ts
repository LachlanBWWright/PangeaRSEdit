import type { GameId } from "./index.ts";

interface GameAssetDefinition {
  assets: string; game: string; port: string;
  home: { filename: string; model: string; skeleton: string } | null;
}

export const GAME_ASSET_CATALOG: Readonly<Record<GameId, GameAssetDefinition>> = {
  OttoMatic: { assets: "ottoMatic", game: "ottomatic", port: "OttoMatic-Android", home: { filename: "OttoMatic.glb", model: "Otto.bg3d", skeleton: "Otto.skeleton.rsrc" } },
  Bugdom: { assets: "bugdom", game: "bugdom1", port: "Bugdom-android", home: { filename: "Bugdom1.glb", model: "Skippy.3dmf", skeleton: "Skippy.skeleton.rsrc" } },
  Bugdom2: { assets: "bugdom2", game: "bugdom2", port: "Bugdom2-Android", home: { filename: "Bugdom2.glb", model: "Grasshopper.bg3d", skeleton: "Skip_Explore.skeleton.rsrc" } },
  Nanosaur: { assets: "nanosaur", game: "nanosaur1", port: "Nanosaur-android", home: { filename: "Nanosaur1.glb", model: "Deinon.3dmf", skeleton: "Deinon.skeleton.rsrc" } },
  Nanosaur2: { assets: "nanosaur2", game: "nanosaur2", port: "Nanosaur2-Android", home: { filename: "Nanosaur2.glb", model: "nano.bg3d", skeleton: "nano.skeleton.rsrc" } },
  CroMagRally: { assets: "croMag", game: "cromagrally", port: "CroMagRally-Android", home: { filename: "CroMag.glb", model: "Grag.bg3d", skeleton: "Grag.skeleton.rsrc" } },
  BillyFrontier: { assets: "billyFrontier", game: "billyfrontier", port: "BillyFrontier-Android", home: { filename: "BillyFrontier.glb", model: "Billy.bg3d", skeleton: "Billy.skeleton.rsrc" } },
  MightyMike: { assets: "mightyMike", game: "mightymike", port: "MightyMike-Android", home: null },
};

export function nativeAssetCandidates(game: GameId, relative: string): readonly string[] {
  if (game === "BillyFrontier" && /^Skeletons\/Billy\.(bg3d|bg3)$/i.test(relative)) return ["Skeletons/Billy.bg3", "Skeletons/Billy.bg3d"];
  if (game === "Nanosaur2" && /^Skeletons\/wormhole\.bg3d$/i.test(relative)) return ["Skeletons/Wormhole_Egg.bg3d", relative];
  return [relative];
}
