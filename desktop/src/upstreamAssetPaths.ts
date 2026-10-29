import { GAME_ASSET_CATALOG, nativeAssetCandidates, relativePathSchema, type GameId } from "@pangea/desktop-contracts";
import { NativeAssetIndex } from "./nativeAssetIndex.ts";

export function upstreamAssetPath(game: GameId, relative: string): string | null {
  if (!relativePathSchema.safeParse(relative).success) return null;
  const names = GAME_ASSET_CATALOG[game];
  const terrain = `assets/${names.assets}/terrain/`;
  if (relative.startsWith(terrain)) {
    const filename = relative.slice(terrain.length);
    if (filename.includes("/")) return null;
    if (game !== "MightyMike") return `Terrain/${filename}`;
    if (/\.tga$/i.test(filename)) return `Images/${filename}`;
    return /\.(map-[123]|tileset)$/i.test(filename) ? `Maps/${filename}` : null;
  }
  const nativeFolders = ["Models", "Skeletons", "Tunnels", "Sprites", "Images", "Audio", "Terrain", "Maps", "Shapes"];
  for (const folder of nativeFolders) {
    const prefix = `games/${names.game}/${folder.toLowerCase()}/`;
    if (!relative.startsWith(prefix)) continue;
    const filename = relative.slice(prefix.length);
    if (folder === "Skeletons" && game === "BillyFrontier" && filename.toLowerCase() === "billy.bg3d") return "Skeletons/Billy.bg3";
    if (folder === "Skeletons" && game === "Nanosaur2" && filename.toLowerCase() === "wormhole.bg3d") return "Skeletons/Wormhole_Egg.bg3d";
    return `${folder}/${filename}`;
  }
  const audio = `generated/pangea-ports/audio/games/${names.port}/Data/Audio/`;
  if (relative.startsWith(audio)) return `Audio/${relative.slice(audio.length)}`;
  const shapes = "data/mightymike/shapes/";
  if (game === "MightyMike" && relative.startsWith(shapes)) return `Shapes/${relative.slice(shapes.length)}`;
  return null;
}

export async function resolveUpstreamAssetPath(dataRoot: string, game: GameId, relative: string): Promise<string | null> {
  const native = upstreamAssetPath(game, relative);
  if (!native) return null;
  const index = new NativeAssetIndex();
  for (const candidate of nativeAssetCandidates(game, native)) {
    const resolved = await index.resolve(dataRoot, candidate);
    if (resolved.isErr()) return null;
    if (resolved.value) return resolved.value;
  }
  return null;
}
