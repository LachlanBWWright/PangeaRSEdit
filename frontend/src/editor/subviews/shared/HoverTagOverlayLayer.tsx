import { useAtomValue } from "jotai";
import { Layer } from "react-konva";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";
import { HoverNameTag } from "./nodeVisuals";

/**
 * A Konva Layer that renders the active hover name tag.
 * Place this as the last Layer inside a Stage so it always appears above
 * all other layers, solving cross-layer z-order issues.
 */
export function HoverTagOverlayLayer() {
  const tag = useAtomValue(ActiveHoverTag);
  return (
    <Layer listening={false}>
      {tag && (
        <HoverNameTag
          x={tag.x}
          y={tag.y}
          text={tag.text}
          fill={tag.fill}
          textColor={tag.textColor}
        />
      )}
    </Layer>
  );
}
