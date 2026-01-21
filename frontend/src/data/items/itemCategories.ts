import { Game } from "../globals/globals";
import { itemTypeNames as ottoItemTypeNames } from "./ottoItemType";
import { itemTypeNames as bugdomItemTypeNames } from "./bugdomItemType";
import { itemTypeNames as bugdom2ItemTypeNames } from "./bugdom2ItemType";
import { itemTypeNames as nanosaurItemTypeNames } from "./nanosaurItemType";
import { itemTypeNames as nanosaur2ItemTypeNames } from "./nanosaur2ItemType";
import { itemTypeNames as croMagItemTypeNames } from "./croMagItemType";
import { itemTypeNames as billyItemTypeNames } from "./billyFrontierItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "./mightyMikeItemType";

export type ItemCategory = "enemy" | "powerup" | "environmental" | "trigger" | "player" | "unknown";

const getItemName = (game: Game, itemType: number): string => {
  switch (game) {
    case Game.OTTO_MATIC: return ottoItemTypeNames[itemType as keyof typeof ottoItemTypeNames] || "";
    case Game.BUGDOM: return bugdomItemTypeNames[itemType as keyof typeof bugdomItemTypeNames] || "";
    case Game.BUGDOM_2: return bugdom2ItemTypeNames[itemType as keyof typeof bugdom2ItemTypeNames] || "";
    case Game.NANOSAUR: return nanosaurItemTypeNames[itemType as keyof typeof nanosaurItemTypeNames] || "";
    case Game.NANOSAUR_2: return nanosaur2ItemTypeNames[itemType as keyof typeof nanosaur2ItemTypeNames] || "";
    case Game.CRO_MAG: return croMagItemTypeNames[itemType as keyof typeof croMagItemTypeNames] || "";
    case Game.BILLY_FRONTIER: return billyItemTypeNames[itemType as keyof typeof billyItemTypeNames] || "";
    case Game.MIGHTY_MIKE: return mightyMikeItemTypeNames[itemType as keyof typeof mightyMikeItemTypeNames] || "";
    default: return "";
  }
};

export function categorizeItem(game: Game, itemType: number): ItemCategory {
  const name = getItemName(game, itemType);
  const lowerName = name.toLowerCase();

  // Heuristic based categorization
  if (lowerName.includes("enemy") || lowerName.includes("boss") || lowerName.includes("bot") || lowerName.includes("monster") || lowerName.includes("dino")) {
    return "enemy";
  }

  if (lowerName.includes("powerup") || lowerName.includes("pickup") || lowerName.includes("atom") || lowerName.includes("fuel") || lowerName.includes("egg") || lowerName.includes("crystal") || lowerName.includes("shield")) {
    return "powerup";
  }

  if (lowerName.includes("checkpoint") || lowerName.includes("start") || lowerName.includes("exit") || lowerName.includes("spawn") || lowerName.includes("reincarnation")) {
    return "player";
  }

  if (lowerName.includes("trigger") || lowerName.includes("zone") || lowerName.includes("teleporter") || lowerName.includes("generator") || lowerName.includes("cam")) {
    return "trigger";
  }

  // Specific game overrides or additional checks could go here
  if (game === Game.OTTO_MATIC) {
      if (lowerName.includes("human")) return "powerup"; // Humans are collected
  }

  if (game === Game.NANOSAUR) {
      if (lowerName.includes("egg")) return "powerup";
  }

  if (name === "Unknown" || name === "") {
      return "unknown";
  }

  return "environmental";
}
