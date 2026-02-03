# Nanosaur Model Loading

## Model Files

Nanosaur uses **3DMF format** files located in `/games/nanosaur1/models/`.

**Important:** Like Bugdom, Nanosaur uses 3DMF (QuickDraw 3D Metafile) format.

### Global Models

Nanosaur has a simpler model structure compared to later games:

**Main model file structure:**
| File | Contents |
|------|----------|
| Global_Models.3dmf | Common game objects |
| Enemy_Models.3dmf | Enemy dinosaurs |
| Item_Models.3dmf | Pickups and items |
| Level_Models.3dmf | Environmental objects |

### Items and Pickups

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | Egg_Red | Red dinosaur egg |
| 1 | Egg_Blue | Blue dinosaur egg |
| 2 | Egg_Green | Green dinosaur egg |
| 3 | Egg_Gold | Gold dinosaur egg |
| 4 | HealthPOW | Health powerup |
| 5 | ShieldPOW | Shield powerup |
| 6 | Weapon_Blaster | Blaster weapon pickup |
| 7 | Weapon_Missile | Missile weapon pickup |
| 8 | Weapon_Sonic | Sonic weapon pickup |
| 9 | Fuel_Can | Fuel canister |
| 10 | TimePortal | Time portal |

### Enemy Dinosaurs

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | Triceratops | Triceratops enemy |
| 1 | Stegosaurus | Stegosaurus enemy |
| 2 | Rex | T-Rex enemy (boss) |
| 3 | Raptor | Velociraptor enemy |
| 4 | Pteranodon | Flying pteranodon |
| 5 | Spitter | Spitting dinosaur |

### Environmental Objects

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | Tree_Palm | Palm tree |
| 1 | Tree_Fern | Fern tree |
| 2 | Rock_Large | Large rock |
| 3 | Rock_Small | Small rock |
| 4 | Bush | Bush |
| 5 | Water_Body | Water plane |
| 6 | Lava_Pool | Lava pool |

## Skeleton Character

**Player (Nanosaur):**
- File: `Nanosaur.3dmf`
- Skeleton: `Nanosaur.skeleton`
- The player-controlled pterodactyl with full skeletal animation

## Liquid Patches

Nanosaur uses special "liquid patch" items for water and lava:

| Item Type | Description | Parameters |
|-----------|-------------|------------|
| WATER_PATCH | Water body | p0=width, p1=height |
| LAVA_PATCH | Lava pool | p0=width, p1=height, p2=height offset |

These are not loaded as 3D models but rendered as flat planes with special materials.

## Item Type Mapping

```c
// From Nanosaur source headers
enum ItemTypes {
    ITEM_EGG_RED = 0,
    ITEM_EGG_BLUE = 1,
    ITEM_EGG_GREEN = 2,
    ITEM_EGG_GOLD = 3,
    ITEM_HEALTH = 4,
    ITEM_SHIELD = 5,
    ITEM_WEAPON_BLASTER = 6,
    ITEM_WEAPON_MISSILE = 7,
    ITEM_WEAPON_SONIC = 8,
    ITEM_FUEL = 9,
    ITEM_TIMEPORTAL = 10,
    // ... etc
};
```

## File Format Notes

- Uses 3DMF (QuickDraw 3D Metafile) format
- Big-endian byte order
- Magic number: `3DMF` (0x33444D46)
- Simpler structure than later Pangea games

## Source Code References

Model definitions in:
- `Source/Headers/items.h` - Item definitions
- `Source/Headers/mobjtypes.h` - Model type enums  
- `Source/3D/QD3D_Support.c` - 3DMF loading
- `Source/Enemies/Enemies.c` - Enemy model setup
- `Source/Items/Items.c` - Item model setup
