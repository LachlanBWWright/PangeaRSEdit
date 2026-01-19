# Map View Filter Options Plan

## Overview

This plan outlines the implementation of filter options that overlay the map view, allowing users to show or hide certain types of items. This improves usability when editing levels with many items by reducing visual clutter.

---

## Current State Analysis

### Existing Infrastructure

The map view is implemented with Konva (2D canvas library):

| Component | File | Purpose |
|-----------|------|--------|
| Map canvas | `src/editor/Map.tsx` | Main 2D map view |
| Item rendering | `src/editor/subviews/items/Item.tsx` | Individual item markers |
| Item menu | `src/editor/subviews/items/ItemMenu.tsx` | Item list/selection UI |
| Canvas atoms | `src/data/canvasView/canvasViewAtoms.ts` | View state management |

### Current Item Display

Items are rendered as colored squares/circles on the map:
- All items are always shown (no filtering)
- Items are color-coded by type
- Hovering shows item name tooltip
- Selected item is highlighted

---

## Implementation Plan

### Phase 1: Filter State Management

#### 1.1 Filter Atoms

**File:** `src/data/canvasView/itemFilterAtoms.ts`

```typescript
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/**
 * Item filter categories that group related item types together
 */
export enum ItemFilterCategory {
  ENEMIES = 'enemies',
  POWERUPS = 'powerups',
  SCENERY = 'scenery',
  TRIGGERS = 'triggers',
  START_END = 'start_end',
  PLATFORMS = 'platforms',
  HAZARDS = 'hazards',
  CHECKPOINTS = 'checkpoints',
  CUSTOM = 'custom',
}

/**
 * Filter state for each category
 */
export interface ItemFilterState {
  [ItemFilterCategory.ENEMIES]: boolean;
  [ItemFilterCategory.POWERUPS]: boolean;
  [ItemFilterCategory.SCENERY]: boolean;
  [ItemFilterCategory.TRIGGERS]: boolean;
  [ItemFilterCategory.START_END]: boolean;
  [ItemFilterCategory.PLATFORMS]: boolean;
  [ItemFilterCategory.HAZARDS]: boolean;
  [ItemFilterCategory.CHECKPOINTS]: boolean;
  [ItemFilterCategory.CUSTOM]: boolean;
}

// Default: all categories visible
const defaultFilterState: ItemFilterState = {
  [ItemFilterCategory.ENEMIES]: true,
  [ItemFilterCategory.POWERUPS]: true,
  [ItemFilterCategory.SCENERY]: true,
  [ItemFilterCategory.TRIGGERS]: true,
  [ItemFilterCategory.START_END]: true,
  [ItemFilterCategory.PLATFORMS]: true,
  [ItemFilterCategory.HAZARDS]: true,
  [ItemFilterCategory.CHECKPOINTS]: true,
  [ItemFilterCategory.CUSTOM]: true,
};

/**
 * Persisted filter state - survives page reloads
 */
export const ItemFilterStateAtom = atomWithStorage<ItemFilterState>(
  'pangea-item-filters',
  defaultFilterState
);

/**
 * Quick toggle: show all items
 */
export const ShowAllItemsAtom = atom(
  (get) => {
    const filters = get(ItemFilterStateAtom);
    return Object.values(filters).every(v => v === true);
  },
  (get, set) => {
    set(ItemFilterStateAtom, defaultFilterState);
  }
);

/**
 * Quick toggle: hide all items
 */
export const HideAllItemsAtom = atom(
  (get) => {
    const filters = get(ItemFilterStateAtom);
    return Object.values(filters).every(v => v === false);
  },
  (get, set) => {
    const allHidden: ItemFilterState = {
      [ItemFilterCategory.ENEMIES]: false,
      [ItemFilterCategory.POWERUPS]: false,
      [ItemFilterCategory.SCENERY]: false,
      [ItemFilterCategory.TRIGGERS]: false,
      [ItemFilterCategory.START_END]: false,
      [ItemFilterCategory.PLATFORMS]: false,
      [ItemFilterCategory.HAZARDS]: false,
      [ItemFilterCategory.CHECKPOINTS]: false,
      [ItemFilterCategory.CUSTOM]: false,
    };
    set(ItemFilterStateAtom, allHidden);
  }
);

/**
 * Set of specific item types to hide (individual overrides)
 */
export const HiddenItemTypesAtom = atomWithStorage<Set<number>>(
  'pangea-hidden-item-types',
  new Set()
);

/**
 * Derived atom: check if a specific item should be visible
 */
export const isItemVisibleAtom = atom((get) => {
  const filterState = get(ItemFilterStateAtom);
  const hiddenTypes = get(HiddenItemTypesAtom);
  
  return (itemType: number, category: ItemFilterCategory): boolean => {
    // Check individual override first
    if (hiddenTypes.has(itemType)) return false;
    
    // Check category filter
    return filterState[category];
  };
});
```

#### 1.2 Item Category Classification

**File:** `src/data/items/itemCategories.ts`

```typescript
import { ItemFilterCategory } from '@/data/canvasView/itemFilterAtoms';
import { Game } from '@/data/globals/globals';

/**
 * Get the filter category for an item type
 */
export function getItemCategory(game: Game, itemType: number): ItemFilterCategory {
  // Game-specific classification
  switch (game) {
    case Game.OTTO_MATIC:
      return getOttoMaticItemCategory(itemType);
    case Game.BUGDOM:
      return getBugdomItemCategory(itemType);
    case Game.BUGDOM_2:
      return getBugdom2ItemCategory(itemType);
    case Game.NANOSAUR:
      return getNanosaurItemCategory(itemType);
    case Game.NANOSAUR_2:
      return getNanosaur2ItemCategory(itemType);
    case Game.CRO_MAG:
      return getCroMagItemCategory(itemType);
    case Game.BILLY_FRONTIER:
      return getBillyFrontierItemCategory(itemType);
    default:
      return ItemFilterCategory.SCENERY;
  }
}

// Otto Matic category classification
function getOttoMaticItemCategory(itemType: number): ItemFilterCategory {
  // Start coords
  if (itemType === 0) return ItemFilterCategory.START_END;
  
  // Enemies (identified by "Enemy_" prefix in name)
  const enemyTypes = [3, 7, 8, 9, 10, 30, 35, 38, 49, 50, 51, 52, 59, 60, 
                      78, 81, 89, 92, 93, 94, 95, 102, 105];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;
  
  // Powerups
  const powerupTypes = [5, 6, 32]; // Atom, PowerupPod, BasicCrystal
  if (powerupTypes.includes(itemType)) return ItemFilterCategory.POWERUPS;
  
  // Platforms
  const platformTypes = [36, 39, 40, 47, 53, 55, 98];
  if (platformTypes.includes(itemType)) return ItemFilterCategory.PLATFORMS;
  
  // Checkpoints & Exit
  if (itemType === 26 || itemType === 27) return ItemFilterCategory.CHECKPOINTS;
  
  // Triggers (gates, teleporters, etc.)
  const triggerTypes = [13, 19, 44, 45, 46, 57, 58, 64, 82];
  if (triggerTypes.includes(itemType)) return ItemFilterCategory.TRIGGERS;
  
  // Hazards
  const hazardTypes = [28, 29, 31, 62, 67, 70, 87, 97];
  if (hazardTypes.includes(itemType)) return ItemFilterCategory.HAZARDS;
  
  // Default to scenery
  return ItemFilterCategory.SCENERY;
}

// Similar functions for other games...
function getBugdomItemCategory(itemType: number): ItemFilterCategory {
  // Implement based on Bugdom item types
  return ItemFilterCategory.SCENERY;
}

function getBugdom2ItemCategory(itemType: number): ItemFilterCategory {
  return ItemFilterCategory.SCENERY;
}

function getNanosaurItemCategory(itemType: number): ItemFilterCategory {
  return ItemFilterCategory.SCENERY;
}

function getNanosaur2ItemCategory(itemType: number): ItemFilterCategory {
  return ItemFilterCategory.SCENERY;
}

function getCroMagItemCategory(itemType: number): ItemFilterCategory {
  return ItemFilterCategory.SCENERY;
}

function getBillyFrontierItemCategory(itemType: number): ItemFilterCategory {
  // Duelers/enemies
  const enemyTypes = [1, 7, 8, 31, 35];
  if (enemyTypes.includes(itemType)) return ItemFilterCategory.ENEMIES;
  
  // Powerups
  if (itemType === 32 || itemType === 36) return ItemFilterCategory.POWERUPS;
  
  // Scenery (buildings, plants, etc.)
  const sceneryTypes = [2, 3, 4, 6, 11, 14, 17, 24, 25, 29, 30];
  if (sceneryTypes.includes(itemType)) return ItemFilterCategory.SCENERY;
  
  // Start
  if (itemType === 0) return ItemFilterCategory.START_END;
  
  return ItemFilterCategory.SCENERY;
}
```

### Phase 2: Filter UI Component

#### 2.1 Filter Overlay Component

**File:** `src/editor/components/ItemFilterOverlay.tsx`

```typescript
import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  ItemFilterStateAtom,
  ItemFilterCategory,
  ShowAllItemsAtom,
  HideAllItemsAtom,
} from '@/data/canvasView/itemFilterAtoms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, Eye, EyeOff } from 'lucide-react';

const CATEGORY_LABELS: Record<ItemFilterCategory, string> = {
  [ItemFilterCategory.ENEMIES]: '👾 Enemies',
  [ItemFilterCategory.POWERUPS]: '⭐ Powerups',
  [ItemFilterCategory.SCENERY]: '🌳 Scenery',
  [ItemFilterCategory.TRIGGERS]: '🚪 Triggers',
  [ItemFilterCategory.START_END]: '🏁 Start/End',
  [ItemFilterCategory.PLATFORMS]: '📦 Platforms',
  [ItemFilterCategory.HAZARDS]: '⚠️ Hazards',
  [ItemFilterCategory.CHECKPOINTS]: '🚩 Checkpoints',
  [ItemFilterCategory.CUSTOM]: '⚙️ Custom',
};

const CATEGORY_COLORS: Record<ItemFilterCategory, string> = {
  [ItemFilterCategory.ENEMIES]: 'text-red-400',
  [ItemFilterCategory.POWERUPS]: 'text-yellow-400',
  [ItemFilterCategory.SCENERY]: 'text-green-400',
  [ItemFilterCategory.TRIGGERS]: 'text-blue-400',
  [ItemFilterCategory.START_END]: 'text-purple-400',
  [ItemFilterCategory.PLATFORMS]: 'text-orange-400',
  [ItemFilterCategory.HAZARDS]: 'text-pink-400',
  [ItemFilterCategory.CHECKPOINTS]: 'text-cyan-400',
  [ItemFilterCategory.CUSTOM]: 'text-gray-400',
};

export const ItemFilterOverlay: React.FC = () => {
  const [filterState, setFilterState] = useAtom(ItemFilterStateAtom);
  const showAll = useSetAtom(ShowAllItemsAtom);
  const hideAll = useSetAtom(HideAllItemsAtom);

  const toggleCategory = (category: ItemFilterCategory) => {
    setFilterState(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const visibleCount = Object.values(filterState).filter(v => v).length;
  const totalCount = Object.keys(filterState).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 z-50 bg-background/90 backdrop-blur-sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          Items ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Item Filters</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showAll()}
                title="Show All"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => hideAll()}
                title="Hide All"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <label
                key={category}
                className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded px-2 py-1"
              >
                <Checkbox
                  checked={filterState[category as ItemFilterCategory]}
                  onCheckedChange={() => toggleCategory(category as ItemFilterCategory)}
                />
                <span className={CATEGORY_COLORS[category as ItemFilterCategory]}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

#### 2.2 Inline Quick Filters

**File:** `src/editor/components/QuickItemFilters.tsx`

```typescript
import React from 'react';
import { useAtom } from 'jotai';
import { ItemFilterStateAtom, ItemFilterCategory } from '@/data/canvasView/itemFilterAtoms';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const QUICK_FILTERS: Array<{
  category: ItemFilterCategory;
  icon: string;
  label: string;
}> = [
  { category: ItemFilterCategory.ENEMIES, icon: '👾', label: 'Enemies' },
  { category: ItemFilterCategory.POWERUPS, icon: '⭐', label: 'Powerups' },
  { category: ItemFilterCategory.SCENERY, icon: '🌳', label: 'Scenery' },
  { category: ItemFilterCategory.TRIGGERS, icon: '🚪', label: 'Triggers' },
];

export const QuickItemFilters: React.FC = () => {
  const [filterState, setFilterState] = useAtom(ItemFilterStateAtom);

  const toggleCategory = (category: ItemFilterCategory) => {
    setFilterState(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="flex gap-1 absolute bottom-2 left-2 z-50 bg-background/80 backdrop-blur-sm rounded-lg p-1">
      {QUICK_FILTERS.map(({ category, icon, label }) => (
        <Tooltip key={category}>
          <TooltipTrigger asChild>
            <Toggle
              pressed={filterState[category]}
              onPressedChange={() => toggleCategory(category)}
              size="sm"
              className="w-8 h-8"
            >
              {icon}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            {filterState[category] ? 'Hide' : 'Show'} {label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
```

### Phase 3: Integration with Item Rendering

#### 3.1 Update Item Component

**File:** `src/editor/subviews/items/Item.tsx` (modified)

```typescript
// Add filter visibility check
import { useAtomValue } from 'jotai';
import { isItemVisibleAtom } from '@/data/canvasView/itemFilterAtoms';
import { getItemCategory } from '@/data/items/itemCategories';
import { Globals } from '@/data/globals/globals';

export const Item = memo(({ item, itemIdx, ... }: ItemProps) => {
  const globals = useAtomValue(Globals);
  const isItemVisible = useAtomValue(isItemVisibleAtom);
  
  // Check if item should be visible based on filters
  const category = getItemCategory(globals.GAME_TYPE, item.type);
  const visible = isItemVisible(item.type, category);
  
  if (!visible) {
    return null; // Don't render filtered items
  }

  // ... rest of existing render logic
});
```

#### 3.2 Update 3D ItemGeometry Component

**File:** `src/editor/threejs/ItemGeometry.tsx` (modified)

```typescript
// Add same filter logic to 3D view
import { useAtomValue } from 'jotai';
import { isItemVisibleAtom } from '@/data/canvasView/itemFilterAtoms';
import { getItemCategory } from '@/data/items/itemCategories';

// In the items.map() render loop:
const category = getItemCategory(globals.GAME_TYPE, item.type);
const visible = isItemVisible(item.type, category);

if (!visible) {
  return null;
}
```

#### 3.3 Update Map Component

**File:** `src/editor/Map.tsx` (modified)

```typescript
import { ItemFilterOverlay } from './components/ItemFilterOverlay';
import { QuickItemFilters } from './components/QuickItemFilters';

// In the render function, add filter components:
return (
  <div className="relative w-full h-full">
    <Stage ...>
      {/* Existing layers */}
    </Stage>
    
    {/* Filter overlay - top right */}
    <ItemFilterOverlay />
    
    {/* Quick filters - bottom left */}
    <QuickItemFilters />
  </div>
);
```

### Phase 4: Advanced Filter Features

#### 4.1 Search/Filter by Item Name

**File:** `src/editor/components/ItemSearchFilter.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Globals } from '@/data/globals/globals';
import { getItemNames } from '@/data/items/getItemNames';
import { HiddenItemTypesAtom } from '@/data/canvasView/itemFilterAtoms';

export const ItemSearchFilter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const globals = useAtomValue(Globals);
  const setHiddenTypes = useSetAtom(HiddenItemTypesAtom);
  
  const itemNames = useMemo(() => {
    return getItemNames(globals);
  }, [globals]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (term.trim() === '') {
      // Clear search - show all
      setHiddenTypes(new Set());
      return;
    }

    // Hide items that don't match search
    const hidden = new Set<number>();
    Object.entries(itemNames).forEach(([typeStr, name]) => {
      const type = Number(typeStr);
      if (!name.toLowerCase().includes(term.toLowerCase())) {
        hidden.add(type);
      }
    });
    setHiddenTypes(hidden);
  };

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-8"
      />
    </div>
  );
};
```

#### 4.2 Filter Presets

**File:** `src/data/canvasView/filterPresets.ts`

```typescript
import { ItemFilterState, ItemFilterCategory } from './itemFilterAtoms';

export interface FilterPreset {
  name: string;
  description: string;
  state: ItemFilterState;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'Gameplay Only',
    description: 'Show enemies, powerups, and triggers',
    state: {
      [ItemFilterCategory.ENEMIES]: true,
      [ItemFilterCategory.POWERUPS]: true,
      [ItemFilterCategory.SCENERY]: false,
      [ItemFilterCategory.TRIGGERS]: true,
      [ItemFilterCategory.START_END]: true,
      [ItemFilterCategory.PLATFORMS]: true,
      [ItemFilterCategory.HAZARDS]: true,
      [ItemFilterCategory.CHECKPOINTS]: true,
      [ItemFilterCategory.CUSTOM]: false,
    },
  },
  {
    name: 'Scenery Only',
    description: 'Show only decorative elements',
    state: {
      [ItemFilterCategory.ENEMIES]: false,
      [ItemFilterCategory.POWERUPS]: false,
      [ItemFilterCategory.SCENERY]: true,
      [ItemFilterCategory.TRIGGERS]: false,
      [ItemFilterCategory.START_END]: false,
      [ItemFilterCategory.PLATFORMS]: false,
      [ItemFilterCategory.HAZARDS]: false,
      [ItemFilterCategory.CHECKPOINTS]: false,
      [ItemFilterCategory.CUSTOM]: true,
    },
  },
  {
    name: 'Navigation',
    description: 'Show paths and navigation aids',
    state: {
      [ItemFilterCategory.ENEMIES]: false,
      [ItemFilterCategory.POWERUPS]: false,
      [ItemFilterCategory.SCENERY]: false,
      [ItemFilterCategory.TRIGGERS]: true,
      [ItemFilterCategory.START_END]: true,
      [ItemFilterCategory.PLATFORMS]: true,
      [ItemFilterCategory.HAZARDS]: false,
      [ItemFilterCategory.CHECKPOINTS]: true,
      [ItemFilterCategory.CUSTOM]: false,
    },
  },
];
```

---

## Testing Strategy

### Unit Tests
- Test filter atom state management
- Test category classification functions
- Test visibility calculations

### Integration Tests
- Test filter UI interactions
- Test that items are properly hidden/shown
- Test filter persistence across page reloads

### Visual Tests
- Screenshot tests for filter overlay
- Verify items are hidden in both 2D and 3D views

---

## File Summary

| File | Purpose |
|------|---------|
| `src/data/canvasView/itemFilterAtoms.ts` | Filter state atoms |
| `src/data/items/itemCategories.ts` | Item-to-category classification |
| `src/data/canvasView/filterPresets.ts` | Preset filter configurations |
| `src/editor/components/ItemFilterOverlay.tsx` | Main filter popover UI |
| `src/editor/components/QuickItemFilters.tsx` | Quick toggle buttons |
| `src/editor/components/ItemSearchFilter.tsx` | Search-based filtering |
| `src/editor/subviews/items/Item.tsx` | Modified for filtering |
| `src/editor/threejs/ItemGeometry.tsx` | Modified for filtering |
| `src/editor/Map.tsx` | Modified to include filter UI |

---

## UI/UX Considerations

### Accessibility
- Keyboard shortcuts for quick toggles (e.g., 1-9 for categories)
- Clear visual feedback when filters are active
- Screen reader support for filter states

### Performance
- Filter checks should be memoized
- Avoid re-rendering unchanged items
- Consider virtualization for large item lists

### Discoverability
- Show filter indicator when items are hidden
- Tooltip explaining filter categories
- "Reset filters" button always visible

---

## Implementation Order

1. **Phase 1**: Filter state atoms and category classification
2. **Phase 2**: Filter overlay UI component
3. **Phase 3**: Integrate with item rendering (2D and 3D)
4. **Phase 4**: Advanced features (search, presets)

---

## Risk Assessment

### Low Risk
- Filter logic is straightforward
- Jotai atoms are well-tested pattern

### Medium Risk
- Category classification may need per-game tuning
- UI overlay positioning on different screen sizes

### Mitigation
- Start with basic category logic, refine based on testing
- Use responsive design patterns for overlay
