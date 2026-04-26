import { toast } from "sonner";

export function isSupportedModelFile(fileName: string): boolean {
  const loweredName = fileName.toLowerCase();
  return (
    loweredName.endsWith(".bg3d") ||
    loweredName.endsWith(".3dmf") ||
    loweredName.endsWith(".glb")
  );
}

export function isSkeletonResourceFile(fileName: string): boolean {
  const loweredName = fileName.toLowerCase();
  return (
    loweredName.endsWith(".skeleton.rsrc") || loweredName.endsWith(".rsrc")
  );
}

export function getUploadDropzoneText(awaitingSkeleton: boolean): {
  title: string;
  body: string;
} {
  if (awaitingSkeleton) {
    return {
      title: "Drop skeleton file here or click to select",
      body: "Optional: add the matching .skeleton.rsrc file for animations.",
    };
  }
  return {
    title: "Drop a model file here or click to select",
    body: "Upload .bg3d, .3dmf, or .glb. BG3D and 3DMF files can optionally use a matching .skeleton.rsrc file.",
  };
}

interface ProcessUploadSelectionArgs {
  readonly file: File;
  readonly awaitingSkeleton: boolean;
  readonly handleSkeletonFileSelect: (file?: File) => void;
  readonly handleBg3dFileSelect: (file: File) => void;
}

export function processUploadSelection({
  file,
  awaitingSkeleton,
  handleSkeletonFileSelect,
  handleBg3dFileSelect,
}: ProcessUploadSelectionArgs): void {
  if (awaitingSkeleton) {
    if (isSkeletonResourceFile(file.name)) {
      handleSkeletonFileSelect(file);
      return;
    }
    toast.error(
      `"${file.name}" is not a .skeleton.rsrc or .rsrc file. Please select a valid skeleton file or skip this step.`,
    );
    return;
  }

  if (isSupportedModelFile(file.name)) {
    handleBg3dFileSelect(file);
    return;
  }

  toast.error(
    `"${file.name}" is not a supported model file. Please select a .bg3d, .3dmf, or .glb file.`,
  );
}
