import { describe, expect, it } from "vitest";
import {
  classifyUploadFile,
  getUploadAcceptTypes,
  updateStagedFiles,
} from "@/editor/gameCards/uploadStagingUtils";

describe("upload staging utils", () => {
  it("accepts bugdom 2 tunnel files alongside paired terrain files before staging", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: true,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: false,
        hasStagedTexture: false,
      }),
    ).toBe(".ter.rsrc,.ter,.tun");
  });

  it("narrows accepted type to the missing staged counterpart", () => {
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: true,
        hasStagedTexture: false,
      }),
    ).toBe(".ter");
    expect(
      getUploadAcceptTypes({
        isBugdom2: false,
        levelFileType: ".ter.rsrc",
        textureFileType: ".ter",
        hasStagedLevel: false,
        hasStagedTexture: true,
      }),
    ).toBe(".ter.rsrc");
  });

  it("classifies staged files case-insensitively", () => {
    expect(
      classifyUploadFile("LEVEL_A.TER.RSRC", ".ter.rsrc", ".ter", false),
    ).toBe("level");
    expect(classifyUploadFile("Level_A.TER", ".ter.rsrc", ".ter", false)).toBe(
      "texture",
    );
    expect(classifyUploadFile("Level_A.TUN", ".ter.rsrc", ".ter", true)).toBe(
      "tunnel",
    );
  });

  it("keeps staged state regardless of upload order", () => {
    const levelFile = new File(["level"], "map.ter.rsrc");
    const textureFile = new File(["tex"], "map.ter");
    const stagedTextureFirst = updateStagedFiles(
      { level: null, texture: null },
      textureFile,
      "texture",
    );
    const stagedBoth = updateStagedFiles(stagedTextureFirst, levelFile, "level");
    expect(stagedBoth.level).toBe(levelFile);
    expect(stagedBoth.texture).toBe(textureFile);

    const stagedLevelFirst = updateStagedFiles(
      { level: null, texture: null },
      levelFile,
      "level",
    );
    const stagedBothOpposite = updateStagedFiles(
      stagedLevelFirst,
      textureFile,
      "texture",
    );
    expect(stagedBothOpposite.level).toBe(levelFile);
    expect(stagedBothOpposite.texture).toBe(textureFile);
  });
});
