export interface UploadAcceptConfig {
  isBugdom2: boolean;
  isNanosaur1?: boolean;
  isMightyMike?: boolean;
  levelFileType: string;
  textureFileType: string | null;
  hasStagedLevel: boolean;
  hasStagedTexture: boolean;
  hasStagedMetadata?: boolean;
  levelMetadataEnabled?: boolean;
}

export function getUploadAcceptTypes(config: UploadAcceptConfig): string {
  const hasStagedMetadata = config.hasStagedMetadata ?? false;
  const metadataEnabled = config.levelMetadataEnabled ?? false;
  const metadataCompanionGame = (config.isNanosaur1 ?? false) || (config.isMightyMike ?? false);
  if (config.isBugdom2 && !config.hasStagedLevel && !config.hasStagedTexture && !hasStagedMetadata) {
    return ".ter.rsrc,.ter,.tun";
  }
  if (metadataCompanionGame && metadataEnabled && !config.hasStagedLevel && !config.hasStagedTexture && !hasStagedMetadata) {
    return `${config.levelFileType},${config.textureFileType},.Meta.rsrc`;
  }
  if (metadataCompanionGame && metadataEnabled && config.hasStagedLevel && !config.hasStagedTexture && !hasStagedMetadata) {
    return `${config.textureFileType},.Meta.rsrc`;
  }
  if (metadataCompanionGame && metadataEnabled && config.hasStagedLevel && config.hasStagedTexture && !hasStagedMetadata) {
    return ".Meta.rsrc";
  }
  if (
    metadataCompanionGame &&
    metadataEnabled &&
    hasStagedMetadata &&
    !config.hasStagedLevel &&
    !config.hasStagedTexture
  ) {
    return `${config.levelFileType},${config.textureFileType}`;
  }
  if (!config.textureFileType) {
    return config.levelFileType;
  }
  if (config.hasStagedLevel && !config.hasStagedTexture) {
    return config.textureFileType;
  }
  if (!config.hasStagedLevel && config.hasStagedTexture) {
    return config.levelFileType;
  }
  return `${config.levelFileType},${config.textureFileType}`;
}

export type UploadFileKind = "level" | "texture" | "metadata" | "tunnel" | "invalid";

export interface StagedFilesState {
  level: File | null;
  texture: File | null;
  metadata?: File | null;
}

export function classifyUploadFile(
  fileName: string,
  levelFileType: string,
  textureFileType: string | null,
  isBugdom2: boolean,
  metadataCompanionGame = false,
  levelMetadataEnabled = false,
): UploadFileKind {
  const lower = fileName.toLowerCase();
  if (isBugdom2 && lower.endsWith(".tun")) {
    return "tunnel";
  }
  const isMightyMikeMap =
    levelFileType === ".map" && /\.map-\d+$/i.test(lower);
  if (lower.endsWith(levelFileType) || isMightyMikeMap) {
    return "level";
  }
  if (textureFileType && lower.endsWith(textureFileType)) {
    return "texture";
  }
  if (metadataCompanionGame && levelMetadataEnabled && lower.endsWith(".meta.rsrc")) {
    return "metadata";
  }
  return "invalid";
}

export function updateStagedFiles(
  current: StagedFilesState,
  file: File,
  fileKind: UploadFileKind,
): StagedFilesState {
  if (fileKind === "level") {
    return { level: file, texture: current.texture, metadata: current.metadata };
  }
  if (fileKind === "texture") {
    return { level: current.level, texture: file, metadata: current.metadata };
  }
  if (fileKind === "metadata") {
    return { level: current.level, texture: current.texture, metadata: file };
  }
  return current;
}
