# Otto Matic Item Type to Model Index Mapping

This document maps item types (from terrain data) to their corresponding model indices in BG3D files.

## How It Works

1. When the game spawns an item, it uses the `itemType` value from the terrain data
2. The game looks up which model file and model index to use
3. The model is loaded from the BG3D file at the specified index

## Complete Mapping Table

| ItemType | Name | Model File | Model Index | Notes |
|----------|------|------------|-------------|-------|
| 0 | MyStartCoords | - | - | No visual model (player start position) |
| 1 | BasicPlant | level1_farm.bg3d | 21 | Tree model |
| 2 | SpacePodGenerator | level4_apocalypse.bg3d | 5 | SpacePod |
| 3 | Enemy_Squooshy | Squooshy.bg3d | 0 | Skeleton model |
| 4 | Human | Farmer.bg3d / BeeWoman.bg3d / Scientist.bg3d / SkirtLady.bg3d | 0 | Param-dependent (p1): 0=Farmer, 1=BeeWoman, 2=Scientist, 3=SkirtLady |
| 5 | Atom | global.bg3d | 0 | Ripple effect |
| 6 | PowerupPod | global.bg3d | 1 | PowerupOrb |
| 7 | Enemy_BrainAlien | BrainAlien.bg3d | 0 | Skeleton model |
| 8 | Checkpoint | global.bg3d | 31 | TeleportBase |
| 11 | Barn | level1_farm.bg3d | 1 | Barn building |
| 12 | Silo | level1_farm.bg3d | 2 | Silo structure |
| 13 | WoodenGate | level1_farm.bg3d | 3 | WoodGate |
| 14 | MetalGate | level1_farm.bg3d | 6 | MetalGate |
| 15 | FencePost | level1_farm.bg3d | 9 | WoodPost |
| 16 | Tractor | level1_farm.bg3d | 11 | Tractor vehicle |
| 17 | CornStalk | level1_farm.bg3d | 16 | CornStalk plant |
| 18 | Sprout | level1_farm.bg3d | 17 | CornSprout |
| 19 | BigLeafPlant | level1_farm.bg3d | 20 | BigLeafPlant |
| 20 | PhonePole | level1_farm.bg3d | 22 | PhonePole |
| 21 | Windmill | level1_farm.bg3d | 23 | Windmill |
| 22 | Rock | level1_farm.bg3d | 27 | Rock_Small |
| 23 | ExitRocket | global.bg3d | 27 | Rocket |
| 28 | SlimePipe | level2_slime.bg3d | 0 | SlimeTube_FancyJ |
| 29 | FallingCrystal | level2_slime.bg3d | 14 | FallingCrystal_Blue |
| 30 | Enemy_Blob | Blob.bg3d | 0 | Skeleton model |
| 31 | BumperBubble | level2_slime.bg3d | 16 | BumperBubble |
| 32 | BasicCrystal | level2_slime.bg3d | 10 | CrystalCluster_Blue |
| 33 | InertBubble | level2_slime.bg3d | 17 | SoapBubble |
| 34 | SlimeTree | level2_slime.bg3d | 26 | SlimeTree_Big |
| 35 | MagnetMonster | MagnetMonster.bg3d | 0 | Skeleton model |
| 36 | FallingSlimePlatform | level2_slime.bg3d | 24 | FallingSlimePlatform_Small |
| 37 | BubblePump | level2_slime.bg3d | 19 | BubblePump |
| 38 | SlimeMech | level2_slime.bg3d | 7 | Mech_OnAStick_Pole |
| 39 | SpinningPlatform | level3_blobboss.bg3d | 5 | CircularPlatform_Blue |
| 40 | MovingPlatform | level3_blobboss.bg3d | 21 | MovingPlatform_Blue |
| 41 | MachineBoss | level2_slime.bg3d | 9 | Mech_Boiler |
| 43 | BlobBossTube | level3_blobboss.bg3d | 31 | Tube_Bent |
| 44 | ScaffoldingPost | level5_cloud.bg3d | 1 | Post0 |
| 45 | JungleGate | level6_jungle.bg3d | 1 | Gate |
| 46 | CrunchDoor | level4_apocalypse.bg3d | 1 | CrunchDoor_Bottom |
| 47 | Manhole | level4_apocalypse.bg3d | 4 | Manhole |
| 48 | Enemy_Flamester | Flamester.bg3d | 0 | Skeleton model |
| 49 | Enemy_GiantLizard | GiantLizard.bg3d | 0 | Skeleton model |
| 50 | Enemy_FlyTrap | FlyTrap.bg3d | 0 | Skeleton model |
| 51 | Enemy_Mantis | Mantis.bg3d | 0 | Skeleton model |
| 52 | TurtlePlatform | level6_jungle.bg3d | 9 | LeafPlatform0 |
| 53 | Smashable | level6_jungle.bg3d | 9 | LeafPlatform0 |
| 54 | LeafPlatform | level6_jungle.bg3d | 9 | LeafPlatform0 |
| 56 | HelpBeacon | global.bg3d | 30 | BrainWave |
| 57 | Teleporter | level4_apocalypse.bg3d | 6 | Teleporter |
| 58 | ZipLinePost | level4_apocalypse.bg3d | 20 | ZipLinePost |
| 59 | Enemy_Mutant | Mutant.bg3d | 0 | Skeleton model |
| 60 | Enemy_MutantRobot | MutantRobot.bg3d | 0 | Skeleton model |
| 61 | HumanScientist | Otto.bg3d | 0 | Same as player (skeleton) |
| 62 | ProximityMine | level4_apocalypse.bg3d | 22 | ProximityMine |
| 63 | LampPost | level4_apocalypse.bg3d | 24 | LampPost |
| 64 | DebrisGate | level4_apocalypse.bg3d | 27 | DebrisGate_Open |
| 65 | GraveStone | level4_apocalypse.bg3d | 34 | GraveStone |
| 66 | CrashedShip | level4_apocalypse.bg3d | 40 | CrashedSaucer |
| 67 | ChainReactingMine | level4_apocalypse.bg3d | 22 | ProximityMine (same model) |
| 68 | Rubble | level4_apocalypse.bg3d | 43 | Rubble0 |
| 69 | TeleporterMap | level4_apocalypse.bg3d | 50 | TeleporterMap0 |
| 70 | GreenSteam | level4_apocalypse.bg3d | 42 | Shockwave |
| 71 | TentacleGenerator | level6_jungle.bg3d | 18 | TentacleGenerator |
| 72 | PitcherPlantBoss | level6_jungle.bg3d | 20 | PitcherPod_Pod |
| 73 | PitcherPod | level6_jungle.bg3d | 20 | PitcherPod_Pod (same) |
| 74 | TractorBeamPost | level6_jungle.bg3d | 26 | TractorBeamPost |
| 75 | Cannon | level5_cloud.bg3d | 8 | Cannon |
| 76 | BumperCar | level5_cloud.bg3d | 10 | BumperCar |
| 77 | TireBumperStrip | level5_cloud.bg3d | 12 | TireBumper |
| 78 | Enemy_Clown | Clown.bg3d | 0 | Skeleton model |
| 79 | Clownfish | Clownfish.bg3d | 0 | Skeleton model |
| 80 | BumperCarPowerPost | level5_cloud.bg3d | 14 | GeneratorBumper |
| 81 | CloudPlatform | level5_cloud.bg3d | 5 | CloudPlatform |
| 82 | CloudTunnel | level5_cloud.bg3d | 6 | CloudTunnel_Frame |
| 83 | RocketSled | level5_cloud.bg3d | 26 | RocketSled |
| 84 | LavaPillar | level8_fireice.bg3d | 1 | LavaPillar_Full |
| 85 | JawsBot | JawsBot.bg3d | 0 | Skeleton model |
| 86 | HammerBot | HammerBot.bg3d | 0 | Skeleton model |
| 87 | DrillBot | DrillBot.bg3d | 0 | Skeleton model |
| 88 | SwingerBot | SwingerBot.bg3d | 0 | Skeleton model |
| 92 | RadarDish | level9_saucer.bg3d | 8 | DishBase |
| 93 | Beemer | Beemer.bg3d | 0 | Skeleton model |

## Model File Summary

### Global Models (global.bg3d)
Contains 36 subgroups (indices 0-35):
- Index 0: Ripple
- Index 1: PowerupOrb
- Index 27: Rocket
- Index 30: BrainWave
- Index 31: TeleportBase

### Level 1 - Farm (level1_farm.bg3d)
Contains 28+ subgroups with farm-themed objects.

### Level 2 - Slime (level2_slime.bg3d)
Contains slime cave objects, crystals, bubbles, and machinery.

### Level 3 - Blob Boss (level3_blobboss.bg3d)
Contains platforms and tubes for the blob boss arena.

### Level 4 - Apocalypse (level4_apocalypse.bg3d)
Contains 50+ subgroups with apocalyptic city objects.

### Level 5 - Cloud (level5_cloud.bg3d)
Contains cloud platforms, bumper cars, and carnival objects.

### Level 6 - Jungle (level6_jungle.bg3d)
Contains jungle vegetation, platforms, and pitcher plants.

### Level 8 - Fire/Ice (level8_fireice.bg3d)
Contains lava and ice themed objects.

### Level 9 - Saucer (level9_saucer.bg3d)
Contains UFO/saucer level objects.

## Param-Dependent Models

Some items select different 3D models based on their parameter values. The model is determined by a specific parameter (usually p0 or p1).

| Item Type | Parameter | Options |
|-----------|-----------|---------|
| Human (4) | p1 | 0: Farmer.bg3d, 1: BeeWoman.bg3d, 2: Scientist.bg3d, 3: SkirtLady.bg3d |

These param-dependent items are defined in `standardParamTypes.ts` using the `TypeSelectorParam` interface with `modelVariants`.

## Skeleton Models

Skeleton models are in the `skeletons/` directory and always use index 0.
Each skeleton model requires its corresponding `.skeleton.rsrc` file for animation data.

| Model File | Character |
|------------|-----------|
| Otto.bg3d | Player (Otto) |
| Farmer.bg3d | Human (Farmer variant) |
| BeeWoman.bg3d | Human (Bee Woman variant) |
| Scientist.bg3d | Human (Scientist variant) |
| SkirtLady.bg3d | Human (Skirt Lady variant) |
| Squooshy.bg3d | Squooshy enemy |
| Blob.bg3d | Blob enemy |
| BrainAlien.bg3d | Brain Alien |
| MagnetMonster.bg3d | Magnet Monster |
| Flamester.bg3d | Flamester |
| GiantLizard.bg3d | Giant Lizard |
| FlyTrap.bg3d | Fly Trap |
| Mantis.bg3d | Mantis |
| Mutant.bg3d | Mutant |
| MutantRobot.bg3d | Mutant Robot |
| Clown.bg3d | Clown |
| Clownfish.bg3d | Clownfish |
| JawsBot.bg3d | Jaws Bot |
| HammerBot.bg3d | Hammer Bot |
| DrillBot.bg3d | Drill Bot |
| SwingerBot.bg3d | Swinger Bot |
| Beemer.bg3d | Beemer |
