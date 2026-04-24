import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { useThree } from "@react-three/fiber";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { toast } from "sonner";
import { Vector3 } from "three";
import type { Event } from "three";
import { Export3DScene } from "@/data/canvasView/canvasViewAtoms";

export interface ThreeEventWithPoint extends Event<string, unknown> {
  point: Vector3;
  nativeEvent?: PointerEvent;
  stopPropagation?: () => void;
}

export function hasPointProperty(
  event: Event<string, unknown>,
): event is ThreeEventWithPoint {
  return "point" in event && event.point instanceof Vector3;
}

export function hasNativePointerEvent(
  event: Event<string, unknown>,
): event is ThreeEventWithPoint {
  return "nativeEvent" in event;
}

export function SceneExporter() {
  const { scene } = useThree();
  const [exportCounter] = useAtom(Export3DScene);
  const last = useRef<number>(exportCounter);
  const exportToastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (exportCounter === last.current) return;
    last.current = exportCounter;

    const exporter = new GLTFExporter();
    exportToastId.current = toast.loading("Exporting 3D map...");

    exporter.parse(
      scene,
      (result: ArrayBuffer | Record<string, unknown>) => {
        if (exportToastId.current !== undefined) {
          toast.dismiss(exportToastId.current);
          exportToastId.current = undefined;
        }

        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: "model/gltf-binary" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "map.glb";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          toast.success("3D map exported (map.glb)");
        } else {
          const output = JSON.stringify(result, null, 2);
          const blob = new Blob([output], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "map.gltf";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          toast.success("3D map exported (map.gltf)");
        }
      },
      (error) => {
        if (exportToastId.current !== undefined) {
          toast.dismiss(exportToastId.current);
          exportToastId.current = undefined;
        }
        console.error("Export error:", error);
        toast.error("Failed to export 3D map");
      },
      { binary: true, embedImages: true },
    );
  }, [exportCounter, scene]);

  return null;
}
