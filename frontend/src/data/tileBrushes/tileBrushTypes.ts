export type TileBrushGame = "bugdom1" | "nanosaur1" | "mightymike";

export interface TileBrushCell {
  readonly tileValue: number;
  readonly enabled: boolean;
}

export interface TileBrush {
  readonly id: string;
  readonly name: string;
  readonly game: TileBrushGame;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly TileBrushCell[];
}

export type TileBrushMode = "select" | "capture" | "stamp" | "edit";
export type TileBrushAnchor = "topLeft" | "center";
