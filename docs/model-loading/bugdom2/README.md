# Bugdom 2 Model Loading

## Model Files

Bugdom 2 uses **BG3D format** files located in `/games/bugdom2/models/`.

### Global Models

**Global.bg3d**
Common objects used across all levels:
| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | PowerupOrb | Generic powerup |
| 1 | HealthOrb | Health pickup |
| 2 | ShieldPOW | Shield powerup |
| 3 | Key_Red | Red key |
| 4 | Key_Blue | Blue key |
| 5 | Key_Green | Green key |
| 6 | Checkpoint | Checkpoint marker |
| 7 | Exit | Exit portal |
| 8-20 | Various common objects |

**Foliage.bg3d**
Plants and decorations:
| Index | Model Name | Description |
|-------|------------|-------------|
| 0-12 | Various plants, bushes, flowers |

### Level-Specific Models

**Level1_Garden.bg3d** (Garden level)
| Index | Model Name |
|-------|------------|
| 0 | Flower_Daisy |
| 1 | Flower_Rose |
| 2 | Bush_Small |
| 3 | Bush_Big |
| 4 | Brick |
| 5 | Pebble |
| 6 | Twig |
| 7 | Leaf |
| 8 | Mushroom |
| 9 | Acorn |
| 10 | Garden_Fence |
| 11 | Planter_Pot |

**Level2_Sidewalk.bg3d** (Sidewalk level)
| Index | Model Name |
|-------|------------|
| 0 | Concrete_Slab |
| 1 | Crack |
| 2 | Weed |
| 3 | Gum_Wad |
| 4 | Bottle_Cap |
| 5 | Coin |
| 6 | Paper_Clip |
| 7 | Rubber_Band |
| 8 | Match_Stick |

**Level4_Plumbing.bg3d** (Plumbing level)
| Index | Model Name |
|-------|------------|
| 0-4 | Pipes, drains, water fixtures |

**Level5_Playroom.bg3d** (Playroom level)
| Index | Model Name |
|-------|------------|
| 0 | Toy_Block |
| 1 | Toy_Car |
| 2 | Toy_Ball |
| 3 | Crayon |
| 4 | LEGO_Brick |
| 5 | Marble |
| 6 | Jacks |
| 7 | Dice |
| 8-43 | Various toys and playroom items |

**Level6_Closet.bg3d** (Closet level)
| Index | Model Name |
|-------|------------|
| 0-30 | Clothes, hangers, shoes, boxes |

**Level7_Gutter.bg3d** (Gutter level)
| Index | Model Name |
|-------|------------|
| 0-5 | Gutter debris, leaves, rainwater |

**Level8_Garbage.bg3d** (Garbage level)
| Index | Model Name |
|-------|------------|
| 0-19 | Trash items, cans, bottles, food scraps |

**Level9_Balsa.bg3d** (Balsa Plane level)
| Index | Model Name |
|-------|------------|
| 0-7 | Balsa wood structures, paper airplane parts |

**Level10_Park.bg3d** (Park level)
| Index | Model Name |
|-------|------------|
| 0-29 | Park objects, benches, fountains, playground equipment |

## Skeleton Characters

Bugdom 2 characters with animation in `/games/bugdom2/skeletons/`:

| File | Character |
|------|-----------|
| Skip.bg3d | Player (Skip the grasshopper) |
| Ant_Red.bg3d | Red ant enemy |
| Ant_Black.bg3d | Black ant enemy |
| Bee.bg3d | Bee enemy |
| Beetle.bg3d | Beetle enemy |
| Caterpillar.bg3d | Caterpillar enemy |
| Dragonfly.bg3d | Dragonfly enemy |
| Flea.bg3d | Flea enemy |
| Fly.bg3d | Fly enemy |
| Mosquito.bg3d | Mosquito enemy |
| Roach.bg3d | Cockroach enemy |
| Spider.bg3d | Spider enemy |
| Wasp.bg3d | Wasp enemy |

## Item Type to Model Mapping

The game maps item types to models using level-specific logic:

```
Item Spawn → ItemType enum → Level-specific model file → Model index
```

### Example: Garden Level Items
- ItemType 1 (FLOWER) → Level1_Garden.bg3d, index 0 or 1
- ItemType 2 (BUSH) → Level1_Garden.bg3d, index 2 or 3
- ItemType 3 (ROCK) → Level1_Garden.bg3d, index 5

### Level Number to Model File
| Level | Model File |
|-------|------------|
| 0 | Level1_Garden.bg3d |
| 1 | Level2_Sidewalk.bg3d |
| 2 | (none) |
| 3 | Level4_Plumbing.bg3d |
| 4 | Level5_Playroom.bg3d |
| 5 | Level6_Closet.bg3d |
| 6 | Level7_Gutter.bg3d |
| 7 | Level8_Garbage.bg3d |
| 8 | Level9_Balsa.bg3d |
| 9 | Level10_Park.bg3d |

## Source Code References

Model definitions in:
- `Source/Headers/items.h` - Item type definitions
- `Source/Headers/mobjtypes.h` - Model object types
- `Source/3D/3D_Support.c` - BG3D loading functions
- `Source/Enemies/*.c` - Enemy model bindings
- `Source/Items/*.c` - Item model bindings
