import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import {
  getExpectedExtLabel,
  getFileAccept,
  handleConversionFileInput,
  handleDroppedConversionFiles,
} from "@/components/SkeletonConversionPanel/fileSelectionUtils";

function dropEvent(files: File[]) {
  return { preventDefault: vi.fn(), dataTransfer: { files } };
}

describe("skeleton conversion file selection", () => {
  beforeEach(() => toastError.mockClear());

  it("describes accepted primary file types", () => {
    expect(getExpectedExtLabel("bg3d-to-glb")).toBe("BG3D or 3DMF");
    expect(getExpectedExtLabel("glb-to-bg3d")).toBe("GLB");
    expect(getFileAccept("bg3d-to-glb")).toBe(".bg3d,.3dmf");
    expect(getFileAccept("glb-to-bg3d")).toBe(".glb");
  });

  it("converts a dropped primary and skeleton pair immediately", async () => {
    const primary = new File([], "MODEL.BG3D");
    const skeleton = new File([], "Player.Skeleton.Rsrc");
    const convert = vi.fn().mockResolvedValue(undefined);
    const selectPrimary = vi.fn().mockResolvedValue(undefined);
    const selectSkeleton = vi.fn().mockResolvedValue(undefined);
    const event = dropEvent([skeleton, primary]);
    await handleDroppedConversionFiles({ event, uploadStep: "select-bg3d", conversionType: "bg3d-to-glb", onConvertPrimaryFile: convert, onSelectPrimaryFile: selectPrimary, onSelectSkeletonFile: selectSkeleton });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(convert).toHaveBeenCalledWith(primary, skeleton);
    expect(selectPrimary).not.toHaveBeenCalled();
  });

  it("selects standalone primary and skeleton drops at the correct step", async () => {
    const primary = new File([], "model.glb");
    const skeleton = new File([], "model.skeleton.rsrc");
    const convert = vi.fn().mockResolvedValue(undefined);
    const selectPrimary = vi.fn().mockResolvedValue(undefined);
    const selectSkeleton = vi.fn().mockResolvedValue(undefined);
    await handleDroppedConversionFiles({ event: dropEvent([primary]), uploadStep: "select-bg3d", conversionType: "glb-to-bg3d", onConvertPrimaryFile: convert, onSelectPrimaryFile: selectPrimary, onSelectSkeletonFile: selectSkeleton });
    expect(selectPrimary).toHaveBeenCalledWith(primary);
    await handleDroppedConversionFiles({ event: dropEvent([skeleton]), uploadStep: "select-skeleton", conversionType: "bg3d-to-glb", onConvertPrimaryFile: convert, onSelectPrimaryFile: selectPrimary, onSelectSkeletonFile: selectSkeleton });
    expect(selectSkeleton).toHaveBeenCalledWith(skeleton);
  });

  it("reports invalid drops", async () => {
    const callbacks = { onConvertPrimaryFile: vi.fn().mockResolvedValue(undefined), onSelectPrimaryFile: vi.fn().mockResolvedValue(undefined), onSelectSkeletonFile: vi.fn().mockResolvedValue(undefined) };
    await handleDroppedConversionFiles({ event: dropEvent([new File([], "notes.txt")]), uploadStep: "select-bg3d", conversionType: "bg3d-to-glb", ...callbacks });
    await handleDroppedConversionFiles({ event: dropEvent([]), uploadStep: "select-skeleton", conversionType: "bg3d-to-glb", ...callbacks });
    expect(toastError).toHaveBeenNthCalledWith(1, "Please drop a BG3D or 3DMF file");
    expect(toastError).toHaveBeenNthCalledWith(2, "Please drop a skeleton.rsrc file or click 'Skip Skeleton'");
  });

  it("routes file-input selections and always resets the input", async () => {
    const primary = new File([], "level.3dmf");
    const selectPrimary = vi.fn().mockResolvedValue(undefined);
    const selectSkeleton = vi.fn().mockResolvedValue(undefined);
    const target = { files: [primary], value: "selected" };
    await handleConversionFileInput({ event: { target }, uploadStep: "select-bg3d", conversionType: "bg3d-to-glb", onSelectPrimaryFile: selectPrimary, onSelectSkeletonFile: selectSkeleton });
    expect(selectPrimary).toHaveBeenCalledWith(primary);
    expect(target.value).toBe("");
    target.files = [new File([], "wrong.txt")];
    target.value = "selected";
    await handleConversionFileInput({ event: { target }, uploadStep: "select-skeleton", conversionType: "bg3d-to-glb", onSelectPrimaryFile: selectPrimary, onSelectSkeletonFile: selectSkeleton });
    expect(toastError).toHaveBeenCalledWith("Please select a skeleton.rsrc file");
    expect(target.value).toBe("");
  });
});
