import { CanvasTexture, RepeatWrapping, ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, type Texture } from "three";
import { loadImageAsset } from "@/assets/imageAssets";

export async function loadFenceTextures(urls: ReadonlySet<string>): Promise<Map<string, Texture>> {
  const loaded = await Promise.all([...urls].map(async (url) => {
    const result = await loadImageAsset({ url, format: /\.tga(?:[?#]|$)/i.test(url) ? "tga" : "image" });
    if (result.isErr()) return null;
    const texture = new CanvasTexture(result.value);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    return { url, texture };
  }));
  const textures = new Map<string, Texture>();
  for (const entry of loaded) if (entry) textures.set(entry.url, entry.texture);
  return textures;
}
