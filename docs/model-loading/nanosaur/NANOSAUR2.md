# Nanosaur 2 Model Loading

## Model Files

Nanosaur 2 uses **BG3D format** files located in `/games/nanosaur2/models/`.

### Global Models (global.bg3d)
Common objects used across all levels:
| Index | Model Name | Description |
|-------|------------|-------------|
| 0-N | Various global items | Powerups, eggs, effects |

### Level Models

**desert.bg3d** (Desert level)
Contains desert-themed objects and structures.

**forest.bg3d** (Forest level)
Contains forest-themed objects and vegetation.

**swamp.bg3d** (Swamp level)
Contains swamp-themed objects and plants.

### Weapon Models (weapons.bg3d)
| Index | Model Name | Description |
|-------|------------|-------------|
| 0 | BlasterBolt | Blaster projectile |
| 1 | GuidedMissile | Missile projectile |
| 2 | HeatSeeker | Heat-seeking missile |
| 3 | SonicBurst | Sonic wave effect |
| 4 | AtomicCharge | Atomic weapon effect |

### Player Parts (playerparts.bg3d)
Parts of the player pterodactyl model for dynamic assembly.

## Skeleton Characters

Located in `/games/nanosaur2/skeletons/`:

| File | Character | Description |
|------|-----------|-------------|
| nano.bg3d | Player | Nanosaur (pterodactyl) player character |
| brach.bg3d | Enemy | Brachiosaurus enemy |
| ramphor.bg3d | Enemy | Ramphorhynchus flying enemy |
| raptor.bg3d | Enemy | Velociraptor enemy |
| worm.bg3d | Enemy | Worm enemy |
| bonusworm.bg3d | Bonus | Bonus worm creature |
| wormhole.bg3d | Effect | Wormhole portal effect |

Each skeleton file has a corresponding `.skeleton.rsrc` file containing animation data.

## Level Structure

Nanosaur 2 has three main levels:
1. Desert (desert.bg3d)
2. Forest (forest.bg3d)
3. Swamp (swamp.bg3d)

## Item Types

| ItemType | Name | Description |
|----------|------|-------------|
| 0 | MyStartCoords | Player start position |
| 1 | Egg_Red | Red dinosaur egg |
| 2 | Egg_Blue | Blue dinosaur egg |
| 3 | Egg_Green | Green dinosaur egg |
| 4 | Egg_Gold | Gold dinosaur egg |
| 5 | HealthPOW | Health powerup |
| 6 | ShieldPOW | Shield powerup |
| 7 | FuelPOW | Fuel pickup |
| 8-20 | Weapons | Various weapon pickups |
| 21+ | Enemies | Enemy spawn points |

## Notes

- Nanosaur 2 uses JPEG textures within BG3D files (tag type 13)
- Models are more detailed than Nanosaur 1
- Skeleton animations are more complex with multiple animation channels
