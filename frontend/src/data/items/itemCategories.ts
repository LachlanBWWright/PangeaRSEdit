/**
 * Item Categories for filtering and grouping items in the map view.
 * 
 * Items are categorized based on their naming patterns and behavior.
 * This categorization enables filtering by category in the editor.
 */

/**
 * High-level item categories for filtering
 */
export enum ItemCategory {
  ENEMY = "enemy",
  POWERUP = "powerup",
  ENVIRONMENTAL = "environmental",
  TRIGGER = "trigger",
  PLAYER = "player",
  UNKNOWN = "unknown",
}

/**
 * Patterns used to detect item categories from item type names
 */
const CATEGORY_PATTERNS: { category: ItemCategory; patterns: RegExp[] }[] = [
  {
    category: ItemCategory.ENEMY,
    patterns: [
      /^Enemy_/i,
      /^Enemy/i,
      /Alien/i,
      /Monster/i,
      /Boss/i,
      /Walker/i,
      /Attacker/i,
    ],
  },
  {
    category: ItemCategory.POWERUP,
    patterns: [
      /^Powerup/i,
      /^POW_/i,
      /Health/i,
      /Ammo/i,
      /Weapon/i,
      /Pickup/i,
      /Bonus/i,
      /Token/i,
      /Coin/i,
      /Gem/i,
      /Clover/i,
      /Acorn/i,
    ],
  },
  {
    category: ItemCategory.TRIGGER,
    patterns: [
      /^Trigger/i,
      /^Zone/i,
      /Checkpoint/i,
      /^Gate/i,
      /^Door/i,
      /Switch/i,
      /Teleport/i,
      /Portal/i,
      /Warp/i,
    ],
  },
  {
    category: ItemCategory.PLAYER,
    patterns: [
      /^StartCoords/i,
      /^ExitRocket/i,
      /^Exit/i,
      /^Spawn/i,
      /^Start/i,
      /^PlayerStart/i,
      /^Camera/i,
    ],
  },
  {
    category: ItemCategory.ENVIRONMENTAL,
    patterns: [
      /^Plant/i,
      /^Tree/i,
      /^Rock/i,
      /^Bush/i,
      /^Flower/i,
      /^Grass/i,
      /^Fence/i,
      /^Barrel/i,
      /^Crate/i,
      /^Decoration/i,
      /^Scenery/i,
      /^Building/i,
      /^Structure/i,
      /^Prop/i,
      /^Water/i,
      /^Bridge/i,
      /^Platform/i,
    ],
  },
];

/**
 * Categorize an item based on its type name.
 * @param itemTypeName - The name of the item type (e.g., "Enemy_Squooshy")
 * @returns The category this item belongs to
 */
export function categorizeItem(itemTypeName: string): ItemCategory {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(itemTypeName)) {
        return category;
      }
    }
  }
  return ItemCategory.UNKNOWN;
}

/**
 * Get display name for a category
 */
export function getCategoryDisplayName(category: ItemCategory): string {
  switch (category) {
    case ItemCategory.ENEMY:
      return "Enemies";
    case ItemCategory.POWERUP:
      return "Powerups";
    case ItemCategory.ENVIRONMENTAL:
      return "Environmental";
    case ItemCategory.TRIGGER:
      return "Triggers";
    case ItemCategory.PLAYER:
      return "Player/Spawns";
    case ItemCategory.UNKNOWN:
      return "Uncategorized";
  }
}

/**
 * Get color for a category (for UI display)
 */
export function getCategoryColor(category: ItemCategory): string {
  switch (category) {
    case ItemCategory.ENEMY:
      return "bg-red-600";
    case ItemCategory.POWERUP:
      return "bg-green-600";
    case ItemCategory.ENVIRONMENTAL:
      return "bg-yellow-600";
    case ItemCategory.TRIGGER:
      return "bg-purple-600";
    case ItemCategory.PLAYER:
      return "bg-blue-600";
    case ItemCategory.UNKNOWN:
      return "bg-gray-600";
  }
}

/**
 * Get all categories as an array (useful for iteration)
 */
export function getAllCategories(): ItemCategory[] {
  return [
    ItemCategory.ENEMY,
    ItemCategory.POWERUP,
    ItemCategory.ENVIRONMENTAL,
    ItemCategory.TRIGGER,
    ItemCategory.PLAYER,
    ItemCategory.UNKNOWN,
  ];
}
