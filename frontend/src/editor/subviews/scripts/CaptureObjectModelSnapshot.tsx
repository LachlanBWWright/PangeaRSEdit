import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSetAtom } from "jotai";
import { Result } from "neverthrow";
import { objectModelSnapshotsAtom } from "./objectModelSnapshots";

export function CaptureObjectModelSnapshot({ snapshotKey }: { snapshotKey: string }) {
  const frames = useRef(0);
  const setSnapshots = useSetAtom(objectModelSnapshotsAtom);
  const capture = useCallback((snapshot: string) => {
    setSnapshots((current) => ({ ...Object.fromEntries(Object.entries(current).slice(-63)), [snapshotKey]: snapshot }));
  }, [setSnapshots, snapshotKey]);
  useFrame(({ gl, scene, camera, invalidate }) => {
    gl.render(scene, camera);
    if (frames.current >= 6) return;
    frames.current += 1;
    if (frames.current < 6) { invalidate(); return; }
    const snapshot = Result.fromThrowable(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 96; canvas.height = 96;
      const context = canvas.getContext("2d");
      if (!context) return null;
      const source = gl.domElement;
      const size = Math.min(source.width, source.height);
      context.drawImage(source, (source.width - size) / 2, (source.height - size) / 2, size, size, 0, 0, 96, 96);
      return canvas.toDataURL("image/png");
    }, () => null)().unwrapOr(null);
    if (snapshot) capture(snapshot);
  }, 1);
  return null;
}
