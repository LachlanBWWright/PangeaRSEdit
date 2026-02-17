# Otto Matic Model Loading

## Model Files

Otto Matic uses BG3D format files located in `/games/ottomatic/`.

### Global Models (`global.bg3d`)
Used across all levels:
- Index 0: Ripple effect
- Index 1: PowerupOrb
- Index 27: Exit Rocket
- Index 30: BrainWave
- Index 31: TeleportBase

### Level 1 - Farm (`level1_farm.bg3d`)
| Index | Model Name |
|-------|------------|
| 1 | Barn |
| 2 | Silo |
| 3 | WoodGate |
| 6 | MetalGate |
| 9 | WoodPost |
| 11 | Tractor |
| 16 | CornStalk |
| 17 | CornSprout |
| 20 | BigLeafPlant |
| 21 | Tree |
| 22 | PhonePole |
| 23 | Windmill |
| 27 | Rock_Small |

### Level 2 - Slime (`level2_slime.bg3d`)
| Index | Model Name |
|-------|------------|
| 0 | SlimeTube_FancyJ |
| 7 | Mech_OnAStick_Pole |
| 9 | Mech_Boiler |
| 10 | CrystalCluster_Blue |
| 14 | FallingCrystal_Blue |
| 16 | BumperBubble |
| 17 | SoapBubble |
| 19 | BubblePump |
| 24 | FallingSlimePlatform_Small |
| 26 | SlimeTree_Big |

### Level 3 - Blob Boss (`level3_blobboss.bg3d`)
| Index | Model Name |
|-------|------------|
| 5 | CircularPlatform_Blue |
| 21 | MovingPlatform_Blue |
| 31 | Tube_Bent |

### Level 4 - Apocalypse (`level4_apocalypse.bg3d`)
| Index | Model Name |
|-------|------------|
| 1 | CrunchDoor_Bottom |
| 4 | Manhole |
| 5 | SpacePod |
| 6 | Teleporter |
| 20 | ZipLinePost |
| 22 | ProximityMine |
| 24 | LampPost |
| 27 | DebrisGate_Open |
| 34 | GraveStone |
| 40 | CrashedSaucer |
| 42 | Shockwave |
| 43 | Rubble0 |
| 50 | TeleporterMap0 |

### Level 5 - Cloud (`level5_cloud.bg3d`)
| Index | Model Name |
|-------|------------|
| 1 | Post0 |
| 5 | CloudPlatform |
| 6 | CloudTunnel_Frame |
| 8 | Cannon |
| 10 | BumperCar |
| 12 | TireBumper |
| 14 | GeneratorBumper |
| 26 | RocketSled |

### Level 6 - Jungle (`level6_jungle.bg3d`)
| Index | Model Name |
|-------|------------|
| 1 | Gate |
| 9 | LeafPlatform0 |
| 18 | TentacleGenerator |
| 20 | PitcherPod_Pod |
| 26 | TractorBeamPost |

### Level 8 - Fire/Ice (`level8_fireice.bg3d`)
| Index | Model Name |
|-------|------------|
| 1 | LavaPillar_Full |

### Level 9 - Saucer (`level9_saucer.bg3d`)
| Index | Model Name |
|-------|------------|
| 8 | DishBase |

## Skeleton Models

Animated characters in `/games/ottomatic/skeletons/`:

| File | Character |
|------|-----------|
| Otto.bg3d + Otto.skeleton.rsrc | Player (Otto) |
| Squooshy.bg3d + Squooshy.skeleton.rsrc | Squooshy enemy |
| Blob.bg3d + Blob.skeleton.rsrc | Blob enemy |
| BrainAlien.bg3d + BrainAlien.skeleton.rsrc | Brain Alien |
| MagnetMonster.bg3d + MagnetMonster.skeleton.rsrc | Magnet Monster |
| Flamester.bg3d + Flamester.skeleton.rsrc | Flamester enemy |
| GiantLizard.bg3d + GiantLizard.skeleton.rsrc | Giant Lizard |
| FlyTrap.bg3d + FlyTrap.skeleton.rsrc | Fly Trap |
| Mantis.bg3d + Mantis.skeleton.rsrc | Mantis enemy |
| Mutant.bg3d + Mutant.skeleton.rsrc | Mutant |
| MutantRobot.bg3d + MutantRobot.skeleton.rsrc | Mutant Robot |
| Clown.bg3d + Clown.skeleton.rsrc | Clown enemy |
| Clownfish.bg3d + Clownfish.skeleton.rsrc | Clownfish |
| JawsBot.bg3d + JawsBot.skeleton.rsrc | Jaws Bot |
| HammerBot.bg3d + HammerBot.skeleton.rsrc | Hammer Bot |
| DrillBot.bg3d + DrillBot.skeleton.rsrc | Drill Bot |
| SwingerBot.bg3d + SwingerBot.skeleton.rsrc | Swinger Bot |
| Beemer.bg3d + Beemer.skeleton.rsrc | Beemer |

## Source Code References

Model enums defined in:
- `Source/Headers/mobjtypes.h`

Model loading functions in:
- `Source/3D/ObjLoad.c`
- `Source/Terrain/Terrain2.c` (item spawn routines)
