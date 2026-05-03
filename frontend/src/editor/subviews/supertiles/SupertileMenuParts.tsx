import { Layer, Image } from "react-konva";
import { cn } from "@/lib/utils";
import type { RefObject } from "react";

export function ImageDisplay({ image }: { image?: HTMLCanvasElement }) {
  if (!image) return <></>;
  return <Image image={image} width={250} height={250} />;
}

interface ImageDropzoneProps {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => Promise<void>;
}

export function ImageDropzone({
  inputRef,
  label,
  accept,
  disabled,
  onFile,
}: ImageDropzoneProps) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-gray-600 rounded-lg p-3 text-center transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-gray-500",
      )}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onDragOver={(event) => {
        if (!disabled) event.preventDefault();
      }}
      onDrop={async (event) => {
        event.preventDefault();
        if (disabled) return;
        const file = event.dataTransfer.files[0];
        if (!file) return;
        await onFile(file);
      }}
    >
      <p className="text-sm text-gray-200">{label}</p>
      <p className="text-xs text-gray-500">Accepted: {accept}</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function TilePreview({ image }: { image?: HTMLCanvasElement }) {
  return (
    <Layer>
      <ImageDisplay image={image} />
    </Layer>
  );
}
