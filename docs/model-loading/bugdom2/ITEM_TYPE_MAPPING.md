# Bugdom 2 Item Type to Model Index Mapping

This document maps item types to their corresponding model indices in BG3D files.

## Level Structure

Bugdom 2 uses level-specific model files. Each level has its own set of item types that map to models in the corresponding BG3D file.

## Model Files by Level

| Level | Model File | Object Count |
|-------|------------|--------------|
| 1 - Garden | Level1_Garden.bg3d | 18 |
| 2 - Sidewalk | Level2_Sidewalk.bg3d | 42 |
| 3 - Pond (Bonus) | - | - |
| 4 - Plumbing | Level4_Plumbing.bg3d | 5 |
| 5 - Playroom | Level5_Playroom.bg3d | 44 |
| 6 - Closet | Level6_Closet.bg3d | 31 |
| 7 - Gutter | Level7_Gutter.bg3d | 6 |
| 8 - Garbage | Level8_Garbage.bg3d | 20 |
| 9 - Balsa | Level9_Balsa.bg3d | 8 |
| 10 - Park | Level10_Park.bg3d | 30 |
| Global | Global.bg3d | 43 |
| Foliage | Foliage.bg3d | 13 |

## Garden Level (Level1_Garden.bg3d)

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | GARDEN_ObjType_Fence | Garden fence |
| 1 | GARDEN_ObjType_Daisy | Daisy flower |
| 2 | GARDEN_ObjType_Tulip | Tulip flower |
| 3 | GARDEN_ObjType_FenceDoor | Fence with door |
| 4 | GARDEN_ObjType_Brick | Brick |
| 5 | GARDEN_ObjType_Pebble | Small pebble |
| 6 | GARDEN_ObjType_Twig | Twig |
| 7 | GARDEN_ObjType_Leaf | Single leaf |
| 8 | GARDEN_ObjType_MushroomA | Mushroom type A |
| 9 | GARDEN_ObjType_MushroomB | Mushroom type B |
| 10 | GARDEN_ObjType_Acorn | Acorn |
| 11 | GARDEN_ObjType_FlatRock | Flat rock |
| 12 | GARDEN_ObjType_Spigot | Water spigot |
| 13 | GARDEN_ObjType_Sign | Garden sign |
| 14 | GARDEN_ObjType_GrassClump | Grass clump |
| 15 | GARDEN_ObjType_Pot | Flower pot |
| 16 | GARDEN_ObjType_SodPatch | Sod patch |
| 17 | GARDEN_ObjType_Sprinkler | Garden sprinkler |

## Sidewalk Level (Level2_Sidewalk.bg3d)

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | SIDEWALK_ObjType_ConcreteSlab | Concrete slab |
| 1-5 | Various debris | Gum, bottle caps, etc. |
| 6-10 | Urban objects | Fire hydrant, mailbox, etc. |
| 11-20 | More street objects | Cars, bikes, etc. |
| 21-41 | Additional objects | Signs, trash, etc. |

## Playroom Level (Level5_Playroom.bg3d)

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | PLAYROOM_ObjType_Ball | Toy ball (checkered) |
| 1 | PLAYROOM_ObjType_Block | Building block |
| 2 | PLAYROOM_ObjType_BlockA | Block type A |
| 3 | PLAYROOM_ObjType_BlockB | Block type B |
| 4 | PLAYROOM_ObjType_Crayon | Crayon |
| 5 | PLAYROOM_ObjType_LEGO | LEGO brick |
| 6 | PLAYROOM_ObjType_Marble | Marble |
| 7 | PLAYROOM_ObjType_Jacks | Jacks game piece |
| 8 | PLAYROOM_ObjType_Dice | Dice |
| 9 | PLAYROOM_ObjType_ToyTrain | Toy train |
| 10 | PLAYROOM_ObjType_TrainTrack | Train track piece |
| 11-43 | Additional toys | Cars, dolls, etc. |

## Global Objects (Global.bg3d)

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | GLOBAL_ObjType_Skip | Player character (Skip) |
| 1 | GLOBAL_ObjType_Shadow | Shadow blob |
| 2 | GLOBAL_ObjType_HealthPOW | Health powerup |
| 3 | GLOBAL_ObjType_FlightPOW | Flight powerup |
| 4 | GLOBAL_ObjType_SpeedPOW | Speed powerup |
| 5 | GLOBAL_ObjType_JumpPOW | Jump powerup |
| 6-10 | Keys | Red, Blue, Green, Gold keys |
| 11 | GLOBAL_ObjType_Checkpoint | Checkpoint marker |
| 12 | GLOBAL_ObjType_Exit | Level exit |
| 13-42 | Additional global items | Various pickups and markers |

## Foliage Objects (Foliage.bg3d)

| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | FOLIAGE_ObjType_TreeA | Tree type A |
| 1 | FOLIAGE_ObjType_TreeB | Tree type B |
| 2 | FOLIAGE_ObjType_BushA | Bush type A |
| 3 | FOLIAGE_ObjType_BushB | Bush type B |
| 4 | FOLIAGE_ObjType_FlowerA | Flower type A |
| 5 | FOLIAGE_ObjType_FlowerB | Flower type B |
| 6-12 | Additional foliage | Various plants and vegetation |

## Skeleton Characters

Located in `/games/bugdom2/skeletons/`:

| File | Character | Description |
|------|-----------|-------------|
| Skip.bg3d | Player | Skip the grasshopper |
| Ant_Red.bg3d | Enemy | Red ant |
| Ant_Black.bg3d | Enemy | Black ant |
| Bee.bg3d | Enemy | Bee |
| Beetle.bg3d | Enemy | Beetle |
| Spider.bg3d | Enemy | Spider |
| Wasp.bg3d | Enemy | Wasp |
| Caterpillar.bg3d | Enemy | Caterpillar |
| Dragonfly.bg3d | Enemy | Dragonfly |
| Flea.bg3d | Enemy | Flea |
| Fly.bg3d | Enemy | Fly |
| Mosquito.bg3d | Enemy | Mosquito |
| Roach.bg3d | Enemy | Cockroach |

## Level-Specific Item Type Resolution

When spawning items in Bugdom 2, the game uses the current level number to determine which model file to load from:

```
ItemType + CurrentLevel → Model File + Model Index
```

For example:
- Level 5, ItemType 0 → Level5_Playroom.bg3d, Index 0 (Ball)
- Level 1, ItemType 0 → Level1_Garden.bg3d, Index 0 (Fence)

## Notes

- Item types are level-relative, meaning ItemType 0 in Level 1 is different from ItemType 0 in Level 5
- Global items (powerups, keys, checkpoints) use Global.bg3d regardless of level
- Foliage items use Foliage.bg3d regardless of level
- Skeleton characters are loaded separately from the skeletons/ directory
