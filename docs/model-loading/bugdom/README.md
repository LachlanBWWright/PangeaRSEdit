# Bugdom Model Loading

## Model Files

Bugdom uses **3DMF format** files located in `/games/bugdom1/models/`.

**Important:** Bugdom uses 3DMF (QuickDraw 3D Metafile) format, not BG3D.

### Global Models

**Global_Models1.3dmf**
Contains common game objects used across levels:
| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | BladderFlower_Open | Open bladder flower |
| 1 | BladderFlower_Closed | Closed bladder flower |
| 2 | Clover | Clover pickup |
| 3 | HealthPOW | Health powerup |
| 4 | Key_Red | Red key |
| 5 | Key_Blue | Blue key |
| 6 | Key_Green | Green key |
| 7 | LadyBug_Wing | Lady bug wing |
| 8 | RollyPolly_Body | Rolly Polly body |
| 9 | RollyPolly_Leg | Rolly Polly leg |
| 10 | SquishBerry | Squish berry |

**Global_Models2.3dmf**
Additional global objects:
| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | Buddy | Buddy character |
| 1 | Caterpillar_Body | Caterpillar segment |
| 2 | Caterpillar_Head | Caterpillar head |
| 3 | Checkpoint | Checkpoint marker |
| 4 | Exit | Exit portal |
| 5 | Firefly | Firefly |
| 6 | Shield_POW | Shield powerup |
| 7 | WaterBug_Body | Water bug body |
| 8 | WaterBug_Leg | Water bug leg |

### Level-Specific Models

**Lawn_Models1.3dmf** (Level 0)
| Index | Model Name |
|-------|------------|
| 0 | Mushroom_Small |
| 1 | Mushroom_Big |
| 2 | Rock_Small |
| 3 | Rock_Big |
| 4 | Flower_Red |
| 5 | Flower_Blue |
| 6 | Grass_Patch |
| 7 | Tree_Trunk |
| 8 | Tree_Leaves |
| 9 | Fence_Post |
| 10 | Fence_Plank |
| 11 | GardenHose |
| 12 | Sprinkler |

**Lawn_Models2.3dmf** (Level 1)
Similar to Lawn_Models1 with additional variations.

**Pond_Models.3dmf** (Level 2)
| Index | Model Name |
|-------|------------|
| 0 | LilyPad_Small |
| 1 | LilyPad_Big |
| 2 | Reed |
| 3 | Rock_Wet |
| 4 | Log |
| 5 | Frog |
| 6 | Fish |
| 7 | Turtle |
| 8 | WaterLily |
| 9 | Dragonfly_Body |
| 10 | Dragonfly_Wing |
| 11 | Cattail |

**Forest_Models.3dmf** (Level 3)
| Index | Model Name |
|-------|------------|
| 0 | Tree_Oak |
| 1 | Tree_Pine |
| 2 | Stump |
| 3 | FallenLog |
| 4 | Acorn |
| 5 | Pinecone |
| 6 | Leaf_Pile |
| 7 | Spider_Web |
| 8 | Spider_Body |
| 9 | Spider_Leg |
| 10 | Beetle_Body |
| 11 | Beetle_Leg |
| 12 | Mushroom_Toxic |

**BeeHive_Models.3dmf** (Level 4)
| Index | Model Name |
|-------|------------|
| 0-28 | Various hive structures and bee-related objects |

**Night_Models.3dmf** (Level 5)
| Index | Model Name |
|-------|------------|
| 0-23 | Night-themed objects, fireflies, glowing elements |

**AntHill_Models.3dmf** (Level 6)
| Index | Model Name |
|-------|------------|
| 0-6 | Ant hill structures, tunnels, ant enemies |

## Skeleton Characters

Bugdom characters with animation in `/games/bugdom1/skeletons/`:

| File | Character |
|------|-----------|
| Skip.3dmf | Player character (Skip the grasshopper) |
| RollyPolly.3dmf | Rolly Polly enemy |
| Ant_Soldier.3dmf | Soldier Ant |
| Ant_Worker.3dmf | Worker Ant |
| Bee.3dmf | Bee enemy |
| Spider.3dmf | Spider enemy |
| Caterpillar.3dmf | Caterpillar |
| BoxerFly.3dmf | Boxer Fly mini-boss |
| KingAnt.3dmf | King Ant boss |

## File Format Notes

3DMF files use big-endian byte ordering and have:
- Magic number: `3DMF` (0x33444D46)
- Hierarchical object structure
- QuickDraw 3D compatible geometry

## Source Code References

Model definitions in:
- `Source/Headers/mobjtypes.h` - Model type enums
- `Source/3D/QD3D_Support.c` - 3DMF loading functions
- `Source/Enemies/*.c` - Enemy model associations
- `Source/Items/*.c` - Item model associations
