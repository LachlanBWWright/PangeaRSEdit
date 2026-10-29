import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from "three";
import { disposeScriptModel } from "./scriptModelDisposal";

describe("uploaded model GPU cleanup", () => {
  it("releases shared geometry, materials and textures exactly once", () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const scene = new Group();
    scene.add(new Mesh(geometry, material), new Mesh(geometry, [material]));
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    disposeScriptModel(scene);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});
