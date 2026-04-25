import { DataType, Game } from "@/data/globals/globals";

export function getGameCardModelPath(gameType: Game): string | undefined {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return "/glbModels/OttoMatic.glb";
    case Game.BUGDOM:
      return "/glbModels/Bugdom1.glb";
    case Game.BUGDOM_2:
      return "/glbModels/Bugdom2.glb";
    case Game.CRO_MAG:
      return "/glbModels/CroMag.glb";
    case Game.NANOSAUR:
      return "/glbModels/Nanosaur1.glb";
    case Game.NANOSAUR_2:
      return "/glbModels/Nanosaur2.glb";
    case Game.BILLY_FRONTIER:
      return "/glbModels/BillyFrontier.glb";
    case Game.MIGHTY_MIKE:
      return undefined;
    default:
      return "/glbModels/OttoMatic.glb";
  }
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
  if (isMightyMike || isBugdom1) {
    return null;
  }
  return isNanosaur1 ? ".trt" : ".ter";
}

export function getSupportedUploadTypes(
  levelFileType: string,
  textureFileType: string | null,
  isBugdom2: boolean,
): string[] {
  return [levelFileType, textureFileType, isBugdom2 ? ".tun" : null].filter(
    (type): type is string => type !== null,
  );
}

export function formatTypeList(types: string[]): string {
  if (types.length <= 1) {
    return types[0] ?? "";
  }
  return `${types.slice(0, -1).join(", ")} or ${types[types.length - 1]}`;
}
