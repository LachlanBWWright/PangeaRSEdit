export interface UvVertex {
  readonly u: number;
  readonly v: number;
}

export interface UvFace {
  /** Indices into the UvVertex array */
  readonly vertexIndices: readonly [number, number, number];
}

/** All UV coordinates and face topology for a single mesh */
export interface UvMeshLayout {
  readonly meshName: string;
  readonly vertices: readonly UvVertex[];
  readonly faces: readonly UvFace[];
}

/** UV layout extracted for a given texture, possibly spanning multiple meshes */
export interface UvLayout {
  readonly textureName: string;
  readonly meshes: readonly UvMeshLayout[];
}

export type UvTransformMode = "move" | "rotate" | "scale" | "none";

export interface UvTransformState {
  readonly mode: UvTransformMode;
  /** Offset applied to selected UVs in UV space (0..1 range) */
  readonly offsetU: number;
  readonly offsetV: number;
  /** Rotation in degrees */
  readonly rotation: number;
  /** Scale factor */
  readonly scaleU: number;
  readonly scaleV: number;
  readonly flipU: boolean;
  readonly flipV: boolean;
}

export function defaultUvTransformState(): UvTransformState {
  return {
    mode: "none",
    offsetU: 0,
    offsetV: 0,
    rotation: 0,
    scaleU: 1,
    scaleV: 1,
    flipU: false,
    flipV: false,
  };
}
