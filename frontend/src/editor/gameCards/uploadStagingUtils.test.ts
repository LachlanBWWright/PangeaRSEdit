import { describe, expect, it } from "vitest";
import { getUploadAcceptTypes } from "./uploadStagingUtils";

describe("getUploadAcceptTypes", () => {
  it("allows bugdom2 tunnel upload before staging", () => {
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

  it("restricts to missing counterpart when one staged file exists", () => {
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
});
