import { Game } from "@/data/globals/globals";
import { Box3, Object3D, Vector3 } from "three";

export interface CameraConfig {
  readonly position: readonly [number, number, number];
  readonly fov: number;
  readonly near: number;
  readonly far: number;
}

/** Builds the default camera framing used by the model canvas for a given game. */
export function buildModelCanvasCameraConfig(gameType?: Game): CameraConfig {
  let position: [number, number, number] = [0, 0, 100];

  if (gameType === Game.BUGDOM) {
    position = [80, 0, 0];
  } else if (gameType === Game.BUGDOM_2) {
    position = [0, 0, 60];
  } else if (gameType === Game.BILLY_FRONTIER) {
    position = [0, 0, 80];
  } else if (gameType === Game.NANOSAUR || gameType === Game.NANOSAUR_2) {
    position = [0, 0, 140];
  } else if (gameType === Game.CRO_MAG) {
    position = [0, 0, 160];
  }

  return {
    position,
    fov: 110,
    near: 0.1,
    far: 10000,
  };
}

/** Traverses a scene and returns the first object whose name matches the selection. */
export function findSceneObjectByName(
  scene: Object3D | null,
  selectedName: string | undefined,
): Object3D | null {
  if (!scene || !selectedName) {
    return null;
  }

  let found: Object3D | null = null;
  scene.traverse((object) => {
    if (object.name === selectedName) {
      found = object;
    }
  });
  return found;
}

/** Computes a per-game model offset so the rendered asset sits at a sensible origin. */
export function getModelPosition(
  gameType: Game | undefined,
  scene: Object3D | null,
): [number, number, number] {
  if (gameType === Game.BUGDOM && scene) {
    const BUGDOM1_GROUND_OFFSET = -60;
    return [0, BUGDOM1_GROUND_OFFSET, 0];
  }

  if (gameType === Game.BUGDOM_2 && scene) {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    return [0, -size.y * 0.25, 0];
  }

  return [0, 0, 0];
}

/** Compares two numeric vectors using a per-component absolute threshold. */
export function isWithinThreshold(
  previous: readonly number[] | null,
  current: readonly number[],
  threshold: number,
): boolean {
  if (!previous || previous.length !== current.length) {
    return false;
  }

  return previous.every(
    (value, index) => Math.abs(value - (current[index] ?? 0)) < threshold,
  );
}
