# Map View Item Filter System

## Overview

This plan describes adding filter options overlaid on the map view (both 2D canvas and 3D view) that allow users to show or hide certain types of items based on categories, specific item types, or custom filters.

## Current State

The editor currently shows all items simultaneously:
- 2D view: Items rendered in `Items.tsx` component within Konva canvas
- 3D view: Items rendered in `ItemGeometry.tsx` using Three.js

There are basic toggle atoms for 3D view layers in `canvasViewAtoms.ts`:
```typescript
export const Show3DSplines = atom<boolean>(true);
export const Show3DItems = atom<boolean>(true);
export const Show3DFences = atom<boolean>(true);
export const Show3DLiquid = atom<boolean>(true);
```

But there's no way to filter *which* items are shown beyond all-or-nothing.

## Problem Statement

Levels can have hundreds of items across many types:
- Enemies (various types)
- Powerups and pickups
- Environmental decorations
- Triggers and checkpoints
- Spawn points

When editing, users often want to:
1. Focus on only one type of item (e.g., "show me all enemies")
2. Hide decorative items that clutter the view
3. Find specific items by filtering to their type
4. See items by category (all triggers, all powerups, etc.)

## Goals

1. Create a filter UI overlay for the map view
2. Support filtering by category (enemy, powerup, trigger, etc.)
3. Support filtering by specific item type
4. Sync filter state between 2D and 3D views
5. Provide quick-access filter presets

---

## Phase 1: Filter State Management

### 1.1 Define Filter State Atoms

**File:** `frontend/src/data/items/itemFilterAtoms.ts`

```typescript
import { atom } from "jotai";
import { ItemCategory } from "./itemCategories";

/**
 * Filter mode determines how filters are applied
 */
export enum FilterMode {
  SHOW_ALL = "show_all",          // No filtering
  SHOW_SELECTED = "show_selected", // Only show checked items
  HIDE_SELECTED = "hide_selected", // Show everything except checked
}

/**
 * Filter state for item visibility
 */
export interface ItemFilterState {
  mode: FilterMode;
  
  // Category-level filters
  categories: Record<ItemCategory, boolean>;
  
  // Individual item type filters (overrides category)
  itemTypes: Record<number, boolean | undefined>;  // undefined = use category
  
  // Search/highlight filter (doesn't hide, just highlights)
  searchQuery: string;
  highlightedTypes: number[];
}

/**
 * Default filter state (show everything)
 */
export const DEFAULT_FILTER_STATE: ItemFilterState = {
  mode: FilterMode.SHOW_ALL,
  categories: {
    enemy: true,
    powerup: true,
    environmental: true,
    trigger: true,
    player: true,
    unknown: true,
  },
  itemTypes: {},
  searchQuery: "",
  highlightedTypes: [],
};

/**
 * Main filter state atom
 */
export const ItemFilterState = atom<ItemFilterState>(DEFAULT_FILTER_STATE);

/**
 * Derived atom: Get list of visible item type IDs
 */
export const VisibleItemTypes = atom((get) => {
  const filter = get(ItemFilterState);
  // Compute which types are visible based on mode, categories, and overrides
  // ...
});

/**
 * Filter presets
 */
export interface FilterPreset {
  name: string;
  description: string;
  state: Partial<ItemFilterState>;
}

export const FilterPresets: FilterPreset[] = [
  {
    name: "Enemies Only",
    description: "Show only enemy items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: true,
        powerup: false,
        environmental: false,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
  {
    name: "Powerups Only",
    description: "Show only powerup items",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: false,
        powerup: true,
        environmental: false,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
  {
    name: "Triggers & Spawns",
    description: "Show triggers, checkpoints, and player spawns",
    state: {
      mode: FilterMode.SHOW_SELECTED,
      categories: {
        enemy: false,
        powerup: false,
        environmental: false,
        trigger: true,
        player: true,
        unknown: false,
      },
    },
  },
  {
    name: "Hide Decorations",
    description: "Hide environmental decorations",
    state: {
      mode: FilterMode.HIDE_SELECTED,
      categories: {
        enemy: false,
        powerup: false,
        environmental: true,
        trigger: false,
        player: false,
        unknown: false,
      },
    },
  },
];

/**
 * Saved custom filters atom
 */
export const SavedFilters = atom<FilterPreset[]>([]);
```

### 1.2 Filter Utility Functions

**File:** `frontend/src/data/items/itemFilterUtils.ts`

```typescript
import { ItemFilterState, FilterMode } from "./itemFilterAtoms";
import { ItemCategory, categorizeItem } from "./itemCategories";
import { TerrainItem } from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

/**
 * Check if an item should be visible based on current filter state
 */
export function isItemVisible(
  item: TerrainItem,
  filter: ItemFilterState,
  game: Game,
): boolean {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return true;
  }
  
  // Check for specific item type override
  const typeOverride = filter.itemTypes[item.type];
  if (typeOverride !== undefined) {
    return filter.mode === FilterMode.SHOW_SELECTED 
      ? typeOverride 
      : !typeOverride;
  }
  
  // Fall back to category
  const category = categorizeItem(game, item.type);
  const categoryVisible = filter.categories[category];
  
  return filter.mode === FilterMode.SHOW_SELECTED 
    ? categoryVisible 
    : !categoryVisible;
}

/**
 * Filter items array based on current filter state
 */
export function filterItems(
  items: TerrainItem[],
  filter: ItemFilterState,
  game: Game,
): TerrainItem[] {
  if (filter.mode === FilterMode.SHOW_ALL) {
    return items;
  }
  return items.filter(item => isItemVisible(item, filter, game));
}

/**
 * Check if an item is highlighted by search
 */
export function isItemHighlighted(
  item: TerrainItem,
  filter: ItemFilterState,
): boolean {
  return filter.highlightedTypes.includes(item.type);
}

/**
 * Get items matching search query
 */
export function searchItems(
  items: TerrainItem[],
  query: string,
  itemTypeNames: Record<number, string>,
): TerrainItem[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return items.filter(item => {
    const typeName = itemTypeNames[item.type] ?? `Type ${item.type}`;
    return typeName.toLowerCase().includes(lowerQuery);
  });
}
```

---

## Phase 2: Filter UI Components

### 2.1 Filter Overlay Panel

**File:** `frontend/src/editor/subviews/filters/ItemFilterPanel.tsx`

```typescript
import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { ItemFilterState, FilterMode, FilterPresets } from "@/data/items/itemFilterAtoms";
import { Globals } from "@/data/globals/globals";
import { categorizeItem, ItemCategory } from "@/data/items/itemCategories";

interface ItemFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemFilterPanel: React.FC<ItemFilterPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useAtom(ItemFilterState);
  const globals = useAtomValue(Globals);
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-4 right-4 w-80 bg-gray-900/95 rounded-lg shadow-xl z-50 border border-gray-700">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Item Filters</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        
        {/* Filter Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Filter Mode</label>
          <select
            value={filter.mode}
            onChange={(e) => setFilter({
              ...filter,
              mode: e.target.value as FilterMode,
            })}
            className="w-full bg-gray-800 text-white rounded p-2"
          >
            <option value={FilterMode.SHOW_ALL}>Show All Items</option>
            <option value={FilterMode.SHOW_SELECTED}>Show Selected Only</option>
            <option value={FilterMode.HIDE_SELECTED}>Hide Selected</option>
          </select>
        </div>
        
        {/* Quick Presets */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {FilterPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setFilter({ ...filter, ...preset.state })}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Category Checkboxes */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Categories</label>
          <CategoryFilterGroup filter={filter} setFilter={setFilter} />
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Search Items</label>
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
            placeholder="Search by name..."
            className="w-full bg-gray-800 text-white rounded p-2"
          />
        </div>
        
        {/* Specific Item Types */}
        <ItemTypeFilterList filter={filter} setFilter={setFilter} game={globals.GAME_TYPE} />
        
        {/* Reset Button */}
        <button
          onClick={() => setFilter(DEFAULT_FILTER_STATE)}
          className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
```

### 2.2 Category Filter Group

```typescript
const CATEGORY_COLORS: Record<ItemCategory, string> = {
  enemy: "bg-red-600",
  powerup: "bg-green-600",
  environmental: "bg-blue-600",
  trigger: "bg-yellow-600",
  player: "bg-purple-600",
  unknown: "bg-gray-600",
};

const CategoryFilterGroup: React.FC<{
  filter: ItemFilterState;
  setFilter: (filter: ItemFilterState) => void;
}> = ({ filter, setFilter }) => {
  const categories: ItemCategory[] = [
    "enemy", "powerup", "environmental", "trigger", "player", "unknown"
  ];
  
  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <label key={category} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.categories[category]}
            onChange={(e) => setFilter({
              ...filter,
              categories: {
                ...filter.categories,
                [category]: e.target.checked,
              },
            })}
            className="w-4 h-4 rounded"
          />
          <span className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
          <span className="text-white capitalize">{category}</span>
        </label>
      ))}
    </div>
  );
};
```

### 2.3 Item Type Filter List

```typescript
const ItemTypeFilterList: React.FC<{
  filter: ItemFilterState;
  setFilter: (filter: ItemFilterState) => void;
  game: Game;
}> = ({ filter, setFilter, game }) => {
  const globals = useAtomValue(Globals);
  const itemTypes = globals.ITEM_TYPES;
  
  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<ItemCategory, number[]> = {
      enemy: [],
      powerup: [],
      environmental: [],
      trigger: [],
      player: [],
      unknown: [],
    };
    
    for (const [typeId, name] of Object.entries(itemTypes)) {
      const category = categorizeItem(game, Number(typeId));
      groups[category].push(Number(typeId));
    }
    
    return groups;
  }, [itemTypes, game]);
  
  return (
    <div className="max-h-64 overflow-y-auto">
      <Accordion type="multiple">
        {Object.entries(grouped).map(([category, types]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="text-white capitalize">
              {category} ({types.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pl-4">
                {types.map((typeId) => {
                  const isOverridden = filter.itemTypes[typeId] !== undefined;
                  const isVisible = filter.itemTypes[typeId] ?? filter.categories[category as ItemCategory];
                  
                  return (
                    <label 
                      key={typeId} 
                      className={`flex items-center gap-2 cursor-pointer ${isOverridden ? 'font-semibold' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setFilter({
                          ...filter,
                          itemTypes: {
                            ...filter.itemTypes,
                            [typeId]: e.target.checked,
                          },
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-300">
                        {itemTypes[typeId] ?? `Type ${typeId}`}
                      </span>
                      {isOverridden && (
                        <button
                          onClick={() => {
                            const { [typeId]: _, ...rest } = filter.itemTypes;
                            setFilter({ ...filter, itemTypes: rest });
                          }}
                          className="text-xs text-gray-500 hover:text-white"
                          title="Reset to category default"
                        >
                          ↩
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
```

### 2.4 Filter Toggle Button

**File:** `frontend/src/editor/subviews/filters/ItemFilterToggle.tsx`

```typescript
import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { ItemFilterState, FilterMode } from "@/data/items/itemFilterAtoms";
import { ItemFilterPanel } from "./ItemFilterPanel";
import { Filter } from "lucide-react";

export const ItemFilterToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const filter = useAtomValue(ItemFilterState);
  
  const isFiltering = filter.mode !== FilterMode.SHOW_ALL;
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded ${isFiltering ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
        title="Item Filters"
      >
        <Filter className="w-5 h-5 text-white" />
        {isFiltering && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </button>
      
      <ItemFilterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
```

---

## Phase 3: Integrate Filters into Views

### 3.1 Update 2D Canvas Items Rendering

**File:** `frontend/src/editor/subviews/Items.tsx`

```typescript
import { useAtomValue } from "jotai";
import { ItemFilterState } from "@/data/items/itemFilterAtoms";
import { filterItems, isItemHighlighted } from "@/data/items/itemFilterUtils";
import { Globals } from "@/data/globals/globals";

export function Items({ itemData, /* ... */ }) {
  const filter = useAtomValue(ItemFilterState);
  const globals = useAtomValue(Globals);
  
  const items = itemData?.Itms?.[1000]?.obj ?? [];
  
  // Apply filter
  const visibleItems = useMemo(
    () => filterItems(items, filter, globals.GAME_TYPE),
    [items, filter, globals.GAME_TYPE]
  );
  
  return (
    <Group>
      {visibleItems.map((item, idx) => {
        const highlighted = isItemHighlighted(item, filter);
        return (
          <ItemMarker
            key={idx}
            item={item}
            highlighted={highlighted}
            // ...
          />
        );
      })}
    </Group>
  );
}
```

### 3.2 Update 3D View Items Rendering

**File:** `frontend/src/editor/threejs/ItemGeometry.tsx`

```typescript
import { useAtomValue } from "jotai";
import { ItemFilterState } from "@/data/items/itemFilterAtoms";
import { filterItems, isItemHighlighted } from "@/data/items/itemFilterUtils";

export const ItemGeometry: React.FC<ItemGeometryProps> = ({ /* ... */ }) => {
  const filter = useAtomValue(ItemFilterState);
  const globals = useAtomValue(Globals);
  
  const items = itemData?.Itms?.[1000]?.obj;
  
  // Apply filter
  const visibleItems = useMemo(
    () => filterItems(items ?? [], filter, globals.GAME_TYPE),
    [items, filter, globals.GAME_TYPE]
  );
  
  return (
    <group name="items">
      {visibleItems.map((item, idx) => {
        const highlighted = isItemHighlighted(item, filter);
        return (
          <ItemMesh
            key={idx}
            item={item}
            highlighted={highlighted}  // Could use emissive glow
            // ...
          />
        );
      })}
    </group>
  );
};
```

### 3.3 Add Filter UI to Canvas Container

**File:** `frontend/src/editor/canvas/CanvasView.tsx`

```typescript
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";

export function CanvasView({ /* ... */ }) {
  return (
    <div className="relative w-full h-full">
      {/* Filter Toggle Button - Top Right */}
      <div className="absolute top-4 right-4 z-40">
        <ItemFilterToggle />
      </div>
      
      {/* Existing canvas content */}
      {viewMode === CanvasView.TWO_D ? (
        <KonvaCanvas />
      ) : (
        <ThreeCanvas />
      )}
    </div>
  );
}
```

---

## Phase 4: Filter Statistics Display

### 4.1 Filter Status Bar

**File:** `frontend/src/editor/subviews/filters/FilterStatusBar.tsx`

```typescript
import React from "react";
import { useAtomValue } from "jotai";
import { ItemFilterState, FilterMode } from "@/data/items/itemFilterAtoms";
import { filterItems } from "@/data/items/itemFilterUtils";
import { Globals } from "@/data/globals/globals";

export const FilterStatusBar: React.FC<{ totalItems: number; items: TerrainItem[] }> = ({
  totalItems,
  items,
}) => {
  const filter = useAtomValue(ItemFilterState);
  const globals = useAtomValue(Globals);
  
  if (filter.mode === FilterMode.SHOW_ALL) {
    return null;  // Don't show when not filtering
  }
  
  const visibleItems = filterItems(items, filter, globals.GAME_TYPE);
  const hiddenCount = totalItems - visibleItems.length;
  
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                    bg-gray-900/90 text-white px-4 py-2 rounded-full text-sm z-40">
      Showing {visibleItems.length} of {totalItems} items
      {hiddenCount > 0 && (
        <span className="text-gray-400 ml-2">
          ({hiddenCount} hidden)
        </span>
      )}
    </div>
  );
};
```

---

## Phase 5: Keyboard Shortcuts

### 5.1 Filter Shortcuts

**File:** `frontend/src/hooks/useFilterShortcuts.ts`

```typescript
import { useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { ItemFilterState, FilterMode, FilterPresets, DEFAULT_FILTER_STATE } from "@/data/items/itemFilterAtoms";

export function useFilterShortcuts() {
  const [filter, setFilter] = useAtom(ItemFilterState);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    // F key toggles filter panel (handled elsewhere)
    
    // 1-4 keys for quick presets
    if (e.key >= '1' && e.key <= '4') {
      const presetIndex = parseInt(e.key) - 1;
      if (FilterPresets[presetIndex]) {
        setFilter({ ...filter, ...FilterPresets[presetIndex].state });
      }
    }
    
    // Escape resets filters
    if (e.key === 'Escape' && filter.mode !== FilterMode.SHOW_ALL) {
      setFilter(DEFAULT_FILTER_STATE);
    }
  }, [filter, setFilter]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

---

## File Summary

### New Files to Create

```
frontend/src/data/items/
├── itemFilterAtoms.ts          # Filter state atoms
├── itemFilterUtils.ts          # Filter utility functions
└── itemCategories.ts           # Item categorization (if not from Plan 002)

frontend/src/editor/subviews/filters/
├── index.ts                    # Export all filter components
├── ItemFilterPanel.tsx         # Main filter panel
├── ItemFilterToggle.tsx        # Toggle button
├── FilterStatusBar.tsx         # Status display
├── CategoryFilterGroup.tsx     # Category checkboxes
└── ItemTypeFilterList.tsx      # Item type list

frontend/src/hooks/
└── useFilterShortcuts.ts       # Keyboard shortcuts
```

### Files to Modify

```
frontend/src/editor/subviews/Items.tsx
  - Apply filter to rendered items

frontend/src/editor/threejs/ItemGeometry.tsx
  - Apply filter to 3D rendered items

frontend/src/editor/canvas/CanvasView.tsx
  - Add filter toggle and status bar

frontend/src/data/canvasView/canvasViewAtoms.ts
  - Add FilterPanelOpen atom
```

---

## Implementation Order

1. **Phase 1**: Filter state management (2 hours)
2. **Phase 2**: Filter UI components (4 hours)
3. **Phase 3**: Integrate into views (2 hours)
4. **Phase 4**: Statistics display (1 hour)
5. **Phase 5**: Keyboard shortcuts (1 hour)

**Total estimated effort**: 10 hours

---

## Dependencies

- Plan 002 (Item Categories) for `itemCategories.ts`
- Existing item type name mappings per game

---

## UI/UX Considerations

### Filter Panel Design
- Semi-transparent dark overlay that doesn't block map view
- Collapsible sections to save space
- Clear visual indicators when filtering is active

### Performance
- Memoize filtered items to avoid re-filtering on every render
- Use `useMemo` with proper dependencies

### Accessibility
- Keyboard navigation for filter options
- Clear focus indicators
- Screen reader friendly labels

---

## Testing Strategy

1. **Unit tests** for filter utility functions
2. **Component tests** for filter UI
3. **Integration tests** for filter + rendering
4. **Visual regression tests** comparing filtered vs unfiltered views

---

## Success Criteria

1. Users can filter items by category in under 2 clicks
2. Filter state persists between 2D/3D view switches
3. Clear visual indication when filtering is active
4. Quick presets cover 80% of common filtering needs
5. Search finds items by name instantly
