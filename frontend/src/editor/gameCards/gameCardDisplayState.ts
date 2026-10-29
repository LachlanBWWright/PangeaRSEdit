import { DataType, Game } from "@/data/globals/globals";
import { GAME_ASSET_CATALOG } from "@pangea/desktop-contracts";
import { desktopGameId } from "@/platform/desktop/games";
import { homeAssetUrl } from "@/assets/gameAssetUrls";

export function getGameCardModelPath(gameType: Game): string | undefined {
  const definition = GAME_ASSET_CATALOG[desktopGameId(gameType)].home;
  return definition ? homeAssetUrl(gameType, `/glbModels/${definition.filename}`) : undefined;
}

export function getLevelFileType(
  isMightyMike: boolean,
  dataType: DataType,
): string {
  if (isMightyMike) {
    return ".map";
  }
  if (dataType === DataType.TRT_FILE) {
    return ".ter";
  }
  return ".ter.rsrc";
}

export function getTextureFileType(
  isMightyMike: boolean,
  isBugdom1: boolean,
  isNanosaur1: boolean,
): string | null {
  if (isMightyMike) {
    return ".tileset";
  }
  if (isBugdom1) {
    return null;
  }
  return isNanosaur1 ? ".trt" : ".ter";
}

export function getSupportedUploadTypes(
  levelFileType: string,
  textureFileType: string | null,
  isBugdom2: boolean,
  metadataCompanionGame = false,
  levelMetadataEnabled = false,
): string[] {
  return [
    levelFileType,
    textureFileType,
    isBugdom2 ? ".tun" : null,
    metadataCompanionGame && levelMetadataEnabled ? ".Meta.rsrc" : null,
  ].filter(
    (type): type is string => type !== null,
  );
}

export function formatTypeList(types: string[]): string {
  if (types.length <= 1) {
    return types[0] ?? "";
  }
  return `${types.slice(0, -1).join(", ")} or ${types[types.length - 1]}`;
}
