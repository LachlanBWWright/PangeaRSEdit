import { describe, expect, it } from "vitest";
import { getDroppedFile, toDownloadName } from "@/components/conversionPanelActions";

describe("conversion panel actions", () => {
  it("replaces only a matching final extension", () => {
    expect(toDownloadName("model.bg3d", "bg3d", "glb")).toBe("model.glb");
    expect(toDownloadName("MODEL.BG3D", "bg3d", "glb")).toBe("MODEL.BG3D");
    expect(toDownloadName("model.bg3d.backup", "bg3d", "glb")).toBe("model.bg3d.backup");
    expect(toDownloadName("archive.model.bg3d", "bg3d", "glb")).toBe("archive.model.glb");
  });

  it("finds the first dropped file with a case-insensitive matching extension", () => {
    const text = new File([], "notes.txt");
    const model = new File([], "MODEL.BG3D");
    const later = new File([], "second.bg3d");
    const event = { dataTransfer: { files: [text, model, later] } };
    expect(getDroppedFile(event, "bg3d")).toBe(model);
    expect(getDroppedFile(event, "glb")).toBeUndefined();
  });
});
