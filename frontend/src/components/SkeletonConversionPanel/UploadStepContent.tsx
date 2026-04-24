import { DropArea } from "./DropArea";
import { SkeletonSelectionPanel } from "./SkeletonSelectionPanel";

interface UploadStepContentProps {
  uploadStep: "select-bg3d" | "select-skeleton" | "completed";
  pendingBg3dFileName: string | null;
  conversionType: "bg3d-to-glb" | "glb-to-bg3d";
  expectedExt: string;
  fileAccept: string;
  loading: boolean;
  onDrop: (e: React.DragEvent) => Promise<void>;
  onOpenPrimaryPicker: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSkipSkeleton: () => Promise<void>;
  onCancelSkeleton: () => void;
  primaryInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UploadStepContent({
  uploadStep,
  pendingBg3dFileName,
  conversionType,
  expectedExt,
  fileAccept,
  loading,
  onDrop,
  onOpenPrimaryPicker,
  onFileInputChange,
  onSkipSkeleton,
  onCancelSkeleton,
  primaryInputRef,
}: UploadStepContentProps) {
  if (uploadStep === "select-bg3d") {
    return (
      <>
        <DropArea onDrop={onDrop} onClick={onOpenPrimaryPicker}>
          <p className="text-gray-400 mb-2">
            Drop a {expectedExt} file here or click to select
          </p>
          <p className="text-sm text-gray-500">
            {conversionType === "bg3d-to-glb"
              ? "Upload .bg3d or .3dmf first, then optionally add skeleton"
              : "Supports .glb files"}
          </p>
        </DropArea>
        <input
          type="file"
          accept={fileAccept}
          className="hidden"
          ref={primaryInputRef}
          onChange={onFileInputChange}
        />
      </>
    );
  }

  if (
    uploadStep === "select-skeleton" &&
    pendingBg3dFileName &&
    conversionType === "bg3d-to-glb"
  ) {
    return (
      <SkeletonSelectionPanel
        pendingBg3dFileName={pendingBg3dFileName}
        onDrop={onDrop}
        onFileInputChange={onFileInputChange}
        onSkipSkeleton={onSkipSkeleton}
        onCancel={onCancelSkeleton}
        loading={loading}
      />
    );
  }

  return null;
}
