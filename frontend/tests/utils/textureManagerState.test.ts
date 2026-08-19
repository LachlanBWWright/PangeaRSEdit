import { describe, expect, it, vi } from "vitest";
import {
  createInitiallyExpandedTextureSet,
  getNextPreviewState,
  handleTextureFileInputChange,
  toggleExpandedTextureIndex,
} from "@/components/TextureManager/textureManagerState";

describe("texture manager state", () => {
  it("creates and toggles immutable expanded sets", () => {
    const initial = createInitiallyExpandedTextureSet(3);
    expect([...initial]).toEqual([0, 1, 2]);
    const removed = toggleExpandedTextureIndex(initial, 1);
    expect([...removed]).toEqual([0, 2]);
    expect([...initial]).toEqual([0, 1, 2]);
    expect([...toggleExpandedTextureIndex(removed, 1)]).toEqual([0, 2, 1]);
  });

  it("expands or clears textures with the global preview toggle", () => {
    expect(getNextPreviewState(false, 2)).toEqual({
      showPreviews: true,
      expandedTextures: new Set([0, 1]),
    });
    expect(getNextPreviewState(true, 2)).toEqual({
      showPreviews: false,
      expandedTextures: new Set(),
    });
  });

  it("replaces a selected texture and resets the input", async () => {
    const texture = { name: "wall", url: "wall.png", type: "diffuse" as const };
    const file = new File(["pixels"], "wall.png", { type: "image/png" });
    const replace = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn();
    const target = { files: [file], value: "selected" };
    await handleTextureFileInputChange({
      event: { target },
      selectedTexture: texture,
      handleReplaceTexture: replace,
      clearSelectedTexture: clear,
    });
    expect(replace).toHaveBeenCalledWith(texture, file);
    expect(clear).toHaveBeenCalledOnce();
    expect(target.value).toBe("");
  });

  it("does not call replacement when either input is missing", async () => {
    const replace = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const target = { files: [], value: "selected" };
    await handleTextureFileInputChange({
      event: { target },
      selectedTexture: null,
      handleReplaceTexture: replace,
      clearSelectedTexture: clear,
    });
    expect(replace).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(target.value).toBe("");
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
