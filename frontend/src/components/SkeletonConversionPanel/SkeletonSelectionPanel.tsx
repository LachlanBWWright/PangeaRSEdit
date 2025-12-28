import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { DropArea } from "./DropArea";

interface Props {
  pendingBg3dFileName: string;
  inputId: string;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkipSkeleton: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function SkeletonSelectionPanel({
  pendingBg3dFileName,
  inputId,
  onDrop,
  onFileInputChange,
  onSkipSkeleton,
  onCancel,
  loading,
}: Props) {
  return (
    <>
      <div className="text-sm text-gray-300 mb-3">
        BG3D file selected: <strong>{pendingBg3dFileName}</strong>
      </div>

      <DropArea
        id={inputId}
        onDrop={onDrop}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <p className="text-gray-400 mb-2">
          Drop skeleton file here or click to select
        </p>
        <p className="text-sm text-gray-500">
          Optional: Add .skeleton.rsrc file for animations
        </p>
      </DropArea>

      <input
        type="file"
        accept=".skeleton.rsrc"
        className="hidden"
        id={inputId}
        onChange={onFileInputChange}
      />

      <div className="flex gap-2">
        <Button
          onClick={onSkipSkeleton}
          variant="outline"
          className="flex-1 text-white"
          disabled={loading}
        >
          {loading ? "Converting..." : "Skip Skeleton"}
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="flex-1 text-gray-400 hover:text-white"
          disabled={loading}
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </>
  );
}
