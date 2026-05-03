import type { RefObject } from "react";

interface TextureLike {
  readonly name: string;
  readonly url: string;
  readonly type: "diffuse" | "normal" | "other";
  readonly material?: string;
  readonly size?: { width: number; height: number };
}

export function getTextureTypeBadgeClass(type: TextureLike["type"]): string {
  if (type === "diffuse") {
    return "bg-blue-600";
  }
  if (type === "normal") {
    return "bg-purple-600";
  }
  return "bg-gray-600";
}

export function getTextureSizeLabel(size?: {
  width: number;
  height: number;
}): string {
  if (!size) {
    return "Unknown size";
  }
  return `${size.width}×${size.height}`;
}

export function triggerTextureReplace<Texture extends TextureLike>(
  texture: Texture,
  setSelectedTexture: (texture: Texture) => void,
  fileInputRef: RefObject<HTMLInputElement | null>,
): void {
  setSelectedTexture(texture);
  fileInputRef.current?.click();
}
