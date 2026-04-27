/** One UV coordinate pair. */
export interface UvVertex {
  readonly u: number;
  readonly v: number;
}

/** Triangle face referencing three UV vertices. */
export interface UvFace {
  /** Indices into the UvVertex array */
  readonly vertexIndices: readonly [number, number, number];
}

/** All UV coordinates and face topology for a single mesh */
export interface UvMeshLayout {
  readonly meshId: string;
  readonly meshName: string;
  readonly geometryIndex: number;
  readonly vertices: readonly UvVertex[];
  readonly faces: readonly UvFace[];
}

/** UV layout extracted for a given texture, possibly spanning multiple meshes */
export interface UvLayout {
  readonly textureName: string;
  readonly materialName?: string;
  readonly meshes: readonly UvMeshLayout[];
}

/** Available UV transform interaction modes. */
export type UvTransformMode = "move" | "rotate" | "scale" | "none";

/** Current UV transform tool state. */
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

/** Returns the default UV transform state. */
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
