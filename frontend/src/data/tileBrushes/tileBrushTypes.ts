/** Identifies the game family a tile brush belongs to. */
export type TileBrushGame = "bugdom1" | "nanosaur1" | "mightymike";

/** One cell inside a tile brush, including whether the cell is enabled. */
export interface TileBrushCell {
  readonly tileValue: number;
  readonly enabled: boolean;
}

/** Serializable tile brush metadata and cell grid. */
export interface TileBrush {
  readonly id: string;
  readonly name: string;
  readonly game: TileBrushGame;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly TileBrushCell[];
}

/** Available interaction modes in the tile brush editor. */
export type TileBrushMode = "select" | "capture" | "stamp" | "edit";
/** Anchor position used when stamping a brush onto the map. */
export type TileBrushAnchor = "topLeft" | "center";
