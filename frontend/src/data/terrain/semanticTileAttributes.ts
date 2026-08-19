import { Game } from "@/data/globals/globals";

export interface SemanticTileAttribute {
  readonly id: string;
  readonly label: string;
  readonly field: "flags" | "bits";
  readonly mask: number;
}

const CRO_MAG_ATTRIBUTES: readonly SemanticTileAttribute[] = [
  { id: "ice", label: "Ice", field: "flags", mask: 1 },
  {
    id: "snow",
    label: "Snow (traction and kick-up)",
    field: "flags",
    mask: 1 << 1,
  },
  { id: "dust", label: "Kick up dust", field: "flags", mask: 1 << 2 },
  { id: "mud", label: "Kick up mud", field: "flags", mask: 1 << 3 },
  { id: "grass", label: "Kick up grass", field: "flags", mask: 1 << 5 },
  { id: "no-skids", label: "Suppress skid marks", field: "flags", mask: 1 << 6 },
  { id: "rock", label: "Rock", field: "flags", mask: 1 << 7 },
];

const NANOSAUR_ATTRIBUTES: readonly SemanticTileAttribute[] = [
  { id: "solid-top", label: "Solid top", field: "bits", mask: 1 },
  { id: "solid-bottom", label: "Solid bottom", field: "bits", mask: 1 << 1 },
  { id: "solid-left", label: "Solid left", field: "bits", mask: 1 << 2 },
  { id: "solid-right", label: "Solid right", field: "bits", mask: 1 << 3 },
  { id: "dust", label: "Make dust", field: "bits", mask: 1 << 4 },
  { id: "lava", label: "Lava", field: "bits", mask: 1 << 5 },
  { id: "water", label: "Water", field: "bits", mask: 1 << 7 },
];

export function getSemanticTileAttributes(
  game: Game,
): readonly SemanticTileAttribute[] {
  if (game === Game.CRO_MAG) return CRO_MAG_ATTRIBUTES;
  if (game === Game.NANOSAUR) return NANOSAUR_ATTRIBUTES;
  return [];
}
