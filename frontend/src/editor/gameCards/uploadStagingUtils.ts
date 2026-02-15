export interface UploadAcceptConfig {
  isBugdom2: boolean;
  levelFileType: string;
  textureFileType: string | null;
  hasStagedLevel: boolean;
  hasStagedTexture: boolean;
}

export function getUploadAcceptTypes(config: UploadAcceptConfig): string {
  if (config.isBugdom2 && !config.hasStagedLevel && !config.hasStagedTexture) {
    return ".ter.rsrc,.ter,.tun";
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

export type UploadFileKind = "level" | "texture" | "tunnel" | "invalid";

export function classifyUploadFile(
  fileName: string,
  levelFileType: string,
  textureFileType: string | null,
  isBugdom2: boolean,
): UploadFileKind {
  const lower = fileName.toLowerCase();
  if (isBugdom2 && lower.endsWith(".tun")) {
    return "tunnel";
  }
  if (lower.endsWith(levelFileType)) {
    return "level";
  }
  if (textureFileType && lower.endsWith(textureFileType)) {
    return "texture";
  }
  return "invalid";
}
