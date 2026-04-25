import { toast } from "sonner";
import type { ChangeEvent } from "react";

interface TextureLike {
  readonly name: string;
  readonly url: string;
  readonly type: "diffuse" | "normal" | "other";
}

export function createInitiallyExpandedTextureSet(
  textureCount: number,
): Set<number> {
  return new Set(Array.from({ length: textureCount }, (_, index) => index));
}

export function toggleExpandedTextureIndex(
  previous: Set<number>,
  index: number,
): Set<number> {
  const next = new Set(previous);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  return next;
}

export function getNextPreviewState(
  showPreviews: boolean,
  textureCount: number,
): { showPreviews: boolean; expandedTextures: Set<number> } {
  const nextShowPreviews = !showPreviews;
  return {
    showPreviews: nextShowPreviews,
    expandedTextures: nextShowPreviews
      ? createInitiallyExpandedTextureSet(textureCount)
      : new Set<number>(),
  };
}

interface HandleFileInputArgs<Texture extends TextureLike> {
  readonly event: ChangeEvent<HTMLInputElement>;
  readonly selectedTexture: Texture | null;
  readonly handleReplaceTexture: (
    texture: Texture,
    file: File,
  ) => Promise<void>;
  readonly clearSelectedTexture: () => void;
}

export async function handleTextureFileInputChange<
  Texture extends TextureLike,
>({
  event,
  selectedTexture,
  handleReplaceTexture,
  clearSelectedTexture,
}: HandleFileInputArgs<Texture>): Promise<void> {
  const file = event.target.files?.[0];
  if (file && selectedTexture) {
    await handleReplaceTexture(selectedTexture, file);
    event.target.value = "";
    clearSelectedTexture();
    return;
  }

  if (!selectedTexture) {
    console.error("No texture selected for replacement");
    toast.error("No texture selected");
  }
  if (!file) {
    console.error("No file selected");
  }
  event.target.value = "";
}
