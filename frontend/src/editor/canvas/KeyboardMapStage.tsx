import type { ComponentProps } from "react";
import { Stage } from "react-konva";
import { KeyboardCanvas } from "@/components/editor/KeyboardCanvas";

export function KeyboardMapStage({
  canvasLabel = "Map canvas",
  ...props
}: ComponentProps<typeof Stage> & { readonly canvasLabel?: string }) {
  return (
    <KeyboardCanvas label={canvasLabel} surfaceSelector=".konvajs-content">
      <Stage {...props} />
    </KeyboardCanvas>
  );
}
