import { Game } from "../globals/globals";
import {
  hasItemLevelBinding,
  type ItemLevelBindingKind,
} from "./itemLevelBindings";

export type ItemLevelSupportLabel =
  | "Supported level"
  | "Unsupported level";

export function getItemLevelSupportLabel(
  game: Game,
  kind: ItemLevelBindingKind,
  itemType: number,
  levelNumber: number | undefined,
): ItemLevelSupportLabel {
  return levelNumber !== undefined &&
      hasItemLevelBinding(game, kind, itemType, levelNumber)
    ? "Supported level"
    : "Unsupported level";
}
