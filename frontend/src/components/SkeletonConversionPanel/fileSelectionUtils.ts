import { toast } from "sonner";

export type ConversionType = "bg3d-to-glb" | "glb-to-bg3d";
export type UploadStep = "select-bg3d" | "select-skeleton" | "completed";

interface HandleDropParams {
  event: React.DragEvent;
  uploadStep: UploadStep;
  conversionType: ConversionType;
  onConvertPrimaryFile: (
    primaryFile: File,
    skeletonFile?: File,
  ) => Promise<void>;
  onSelectPrimaryFile: (primaryFile: File) => Promise<void>;
  onSelectSkeletonFile: (skeletonFile: File) => Promise<void>;
}

interface HandleFileInputParams {
  event: React.ChangeEvent<HTMLInputElement>;
  uploadStep: UploadStep;
  conversionType: ConversionType;
  onSelectPrimaryFile: (primaryFile: File) => Promise<void>;
  onSelectSkeletonFile: (skeletonFile: File) => Promise<void>;
}

function getExpectedExtensions(conversionType: ConversionType): string[] {
  return conversionType === "bg3d-to-glb" ? [".bg3d", ".3dmf"] : [".glb"];
}

export function getExpectedExtLabel(conversionType: ConversionType): string {
  return conversionType === "bg3d-to-glb" ? "BG3D or 3DMF" : "GLB";
}

export function getFileAccept(conversionType: ConversionType): string {
  return conversionType === "bg3d-to-glb" ? ".bg3d,.3dmf" : ".glb";
}

export async function handleDroppedConversionFiles({
  event,
  uploadStep,
  conversionType,
  onConvertPrimaryFile,
  onSelectPrimaryFile,
  onSelectSkeletonFile,
}: HandleDropParams): Promise<void> {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);
  const expectedExt = getExpectedExtensions(conversionType);
  const primaryFile = files.find((f) =>
    expectedExt.some((ext) => f.name.toLowerCase().endsWith(ext)),
  );
  const skeletonFile = files.find((f) =>
    f.name.toLowerCase().endsWith(".skeleton.rsrc"),
  );

  if (uploadStep === "select-bg3d") {
    if (!primaryFile) {
      toast.error(
        conversionType === "bg3d-to-glb"
          ? "Please drop a BG3D or 3DMF file"
          : "Please drop a GLB file",
      );
      return;
    }
    if (skeletonFile && conversionType === "bg3d-to-glb") {
      await onConvertPrimaryFile(primaryFile, skeletonFile);
      return;
    }
    await onSelectPrimaryFile(primaryFile);
    return;
  }

  if (skeletonFile) {
    await onSelectSkeletonFile(skeletonFile);
    return;
  }
  toast.error("Please drop a skeleton.rsrc file or click 'Skip Skeleton'");
}

export async function handleConversionFileInput({
  event,
  uploadStep,
  conversionType,
  onSelectPrimaryFile,
  onSelectSkeletonFile,
}: HandleFileInputParams): Promise<void> {
  const file = event.target.files?.[0];
  if (!file) return;

  if (uploadStep === "select-bg3d") {
    const expectedExt = getExpectedExtensions(conversionType);
    if (expectedExt.some((ext) => file.name.toLowerCase().endsWith(ext)))
      await onSelectPrimaryFile(file);
    else
      toast.error(
        conversionType === "bg3d-to-glb"
          ? "Please select a BG3D or 3DMF file"
          : "Please select a GLB file",
      );
  } else if (file.name.toLowerCase().endsWith(".skeleton.rsrc")) {
    await onSelectSkeletonFile(file);
  } else {
    toast.error("Please select a skeleton.rsrc file");
  }

  event.target.value = "";
}
