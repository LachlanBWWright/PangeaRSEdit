# Item and spline source audit

This audit was produced from the original game source trees only. Existing editor mappings were intentionally not consulted while gathering these findings so the notes below could be compared against the editor independently afterward.

## Shared patterns

Across the 3D Pangea-era games, terrain items consistently use a compact `type + parm[4] + flags` record and spline items use `placement + type + parm[4] + flags`. The recurring pattern is:

| Field | Common meaning |
| --- | --- |
| `parm[0]` | primary variant, subtype, linked ID, or coarse rotation |
| `parm[1]` | fine rotation, height/speed/count, or color/state |
| `parm[2]` | secondary subtype, linked ID, or scale |
| `parm[3]` | behavior bitflags when used at all |

The two big exceptions are **Mighty Mike**, which is sprite-driven and has no spline system in the inspected source, and **Nanosaur 1**, which also showed no spline-item support.

## Bugdom 1

- **Terrain dispatch:** `games/bugdom/src/Terrain/Terrain2.c:45-105`
- **Spline dispatch:** `games/bugdom/src/Terrain/SplineItems.c:45-104`
- **Structs:** `games/bugdom/src/Headers/structs.h` and `games/bugdom/src/Headers/splineitems.h`

Bugdom 1 exposes **64 terrain item IDs (0-63)** and a smaller spline table that primes enemy and moving-platform style objects. The source clearly shows verified terrain families such as Rock, Clover, Grass, Weed, Pond Grass, Reed, Firecracker, Detonator, Hive Door, Root Swing, Water Valve, Honey Tube, ant pipes, and several enemy entries in the main add table.

Representative parameter findings from `games/bugdom/src/Items/Items.c` and `games/bugdom/src/Items/Items2.c`:

| Item | Source-derived params |
| --- | --- |
| Rock | `parm[0]` selects flat rock vs rock variant |
| Clover / Grass / Weed / Pond Grass / Reed | `parm[0]` selects mesh variant |
| Firecracker | `parm[0]` acts as detonator/type linkage |
| Detonator | `parm[0]` detonator ID, `parm[1]` quarter-turn rotation, `parm[2]` color, `parm[3]` flags |
| Hive Door | `parm[0]` quarter-turn rotation, `parm[1]` door color/state family |
| Root Swing | rotation plus extra height/scale/behavior data split across `parm[0-3]` |
| Water Valve / Bent Pipe / Horizontal Pipe | linked valve IDs plus water-behavior flags in `parm[3]` |

Representative model behavior from source:

- Grass/Clover/Weed families map to level-specific display-group meshes selected from `parm[0]`.
- Rock uses level-specific flat/regular rock selections.
- Detonators and hive doors choose explicit color-coded variants.
- Several enemies and moving hazards are spline-primed instead of only terrain-spawned.

Confirmed spline-prime entries include BoxerFly, Slug, Ant, Honeycomb Platform, Mosquito, Foot, Spider, Caterpillar, Larva, Worker Bee, Roach, and Skippy.

## Bugdom 2

- **Terrain dispatch:** `games/bugdom2/Source/Terrain/Terrain2.c:47-120`
- **Spline dispatch:** `games/bugdom2/Source/Terrain/SplineItems.c:45-116`
- **Structs:** `games/bugdom2/Source/Headers/structs.h:39-75`

Bugdom 2 exposes **86 terrain item IDs (0-85)** and a wider spline set than Bugdom 1. The terrain table covers lawn, pool, toy-room, closet, garden, and other level-specific content, including Snail, Daisy, Grass, Tulip, Scarecrow, RideBall, bowling props, POWs, Firecracker, Flea, Tick, Slot Car, Toy Soldier, Otto, Cardboard Box, Trampoline, Vacuume, Book Stack, Roach, Ant, Pond Fish, and more.

Source-derived patterns called out during the audit:

- `parm[0]` is still the dominant variant selector.
- Doors, rideables, bowling pieces, fireworks, and several puzzle objects use small integer IDs to switch behavior.
- Spline-only or spline-meaningful entries include Slot Car, Bumble Bee, Flea, Tick, Otto, Dragonfly, Vacuume, Moth pathing, Computer Bug, Hanger, Roach, and Ant.

The source tables are good enough to validate which IDs are terrain-only, spline-capable, or spline-only, but exact `.bg3d` filename resolution for many level-specific objects still lives behind display-group/type enums rather than direct filenames.

## Billy Frontier

- **Terrain dispatch:** `games/billyfrontier/Source/Terrain/Terrain2.c:45-86`
- **Spline dispatch:** `games/billyfrontier/Source/Terrain/SplineItems.c`
- **Structs:** `games/billyfrontier/Source/Headers/structs.h`

Billy Frontier exposes **37 terrain item IDs (0-36)**. The terrain table shows Building, Headstone, Plant, Coffin, Barrel, Wood Crate, Hay Bale, Post, Boost, Dead Tree, Rock, Electric Fence, Tumbleweed, Tremor Grave, Tee Pee, Swamp Cabin, Free Life POW, Spear Skull, Peso, and several shootout enemies.

Reliable parameter findings from `games/billyfrontier/Source/Items/Items.c`:

| Item | Source-derived params |
| --- | --- |
| Building | `parm[0]` building variant, `parm[1]` rotation |
| Headstone | `parm[0]` variant, `parm[1]` eighth-turn rotation |
| Plant | `parm[0]` variant; the actual model family depends on area |
| Coffin | `parm[0]` variant, `parm[1]` eighth-turn rotation |
| Barrel | `parm[0]` picks regular vs TNT-style behavior |
| Wood Crate | `parm[0]` crate family, `parm[1]` rotation, `parm[2]` contents kind |
| Dead Tree | rotation and variant are split between `parm[0]`/`parm[1]` |

Confirmed spline-prime items include Stampede Kanga, Stampede Camera, Walker, Tumbleweed, Tremor Alien, and Stampede Kangarex.

## Cro-Mag Rally

- **Terrain dispatch:** `games/cromagrally/Source/Terrain/Terrain2.c:45-114`
- **Spline dispatch:** `games/cromagrally/Source/Terrain/SplineItems.c:44-114`
- **Structs:** `games/cromagrally/Source/Headers/structs.h`

Cro-Mag Rally exposes **67 terrain item IDs (0-66)** with heavy level-specific model usage. The terrain table includes Cactus, Water Patch, Sign, Tree, POWs, Finish Line, Vase, Rickshaw, Flagpole, Waterfall, Token, Dust Devil, Snowman, Lava Generator, Pillar, Boat, Statue, Bubble Generator, Rock, Bronto Neck, Vine, Castle Tower, Catapult, House, Volcano, Coliseum, Barricade, Cannon, Clam, Sea Mine, Dragon, Tar Patch, Totem Pole, Druid, Flower, and more.

Recurring source patterns:

- `parm[0]` is normally the item or mesh subtype.
- `parm[1]` is commonly 4-way or 8-way rotation, though some items reinterpret it as a height offset.
- spline-only wildlife/hazard entries are routed through `NilAdd` in the terrain table and primed in `SplineItems.c`.

Confirmed spline families include Yeti, Camel, Beetle, Shark, Troll, Pterodactyl, Mummy, Polar Bear, and Viking.

## Mighty Mike

- **Terrain dispatch:** `games/mightymike/src/Playfield/Playfield.c:117-174`
- **Structs:** `games/mightymike/src/Headers/structures.h:32-42`

Mighty Mike exposes **56 item IDs (0-55)** through a sprite-driven add table rather than the display-group and spline-heavy structure used by the later 3D titles. The source tables cover Caveman, Bunny, Triceratops, Turtle, Man-Eating Plant, Dino Egg, Baby Dino, T-Rex, Clown Car, Jack in the Box, Key, Candy Moving Platform, Candy Door, Star, Weapon Powerup, Misc Powerup, Gumball, Dragon, Witch, Soldier, Spider, Poison Apple, Slinky, Ship POW, Robot, Doggy, Bargain Door, Hydrant, and others.

Reliable parameter findings:

| Item | Source-derived params |
| --- | --- |
| Candy Moving Platform | speed-like value in `parm[0]` |
| Misc Powerup | `parm[0]` selects the powerup family |
| Bunny / enemy variants | `parm[0]` often selects the subtype/animation family |

No spline-item system was identified in the inspected Mighty Mike source.

## Nanosaur 1

- **Terrain dispatch:** `games/nanosaur/src/Terrain/Terrain2.c:152-172`
- **Structs:** `games/nanosaur/src/Headers/structs.h:184-200`

Nanosaur 1 exposes **20 terrain item IDs** in the inspected terrain table. Verified entries include PowerUp, LavaPatch, Egg, GasVent, Tree, Boulder, Mushroom, Bush, WaterPatch, and Crystal.

Representative parameter findings:

| Item | Source-derived params |
| --- | --- |
| Tree | `parm[0]` selects the tree mesh family |
| LavaPatch | `parm[3]` carries multiple behavior bits |
| Bush | `parm[3]` can gate embedded enemy behavior |
| Egg | `parm[0]` selects egg/species color family |
| GasVent | `parm[3]` carries limiter behavior |

No spline-item support was identified in the inspected Nanosaur 1 source.

## Nanosaur 2

- **Terrain dispatch:** `games/nanosaur2/Source/Terrain/Terrain2.c:50-101`
- **Spline structures:** `games/nanosaur2/Source/Headers/structs.h:47-53,239-247`
- **JPEG terrain load path:** `games/nanosaur2/Source/System/File.c:1022-1067,1648-1674`

Nanosaur 2 exposes **49 terrain item IDs (0-48)** and at least two confirmed spline-primed item families in the inspected source: **Dust Devil** and **Laser Orb**.

Representative source-derived parameter findings:

| Item | Source-derived params |
| --- | --- |
| Rock | `parm[0]` variant, `parm[1]` fixed-vs-random rotation mode |
| Birch/Pine/Grass/Fern families | `parm[0]` selects mesh family within the level set |
| Air Mine | `parm[0]` sets a height/chain mode |
| Weapon POW | `parm[0]` selects the weapon family |
| Egg | `parm[0]` selects egg color |

Important terrain finding from `File.c`: after the JPEG payload is decompressed, the engine **explicitly flips the decoded texture vertically** because the `.ter` file stores pixel rows bottom-up. That source comment is the ground truth for editor-side JPEG orientation handling.

## Ottomatic

- **Terrain dispatch:** `games/ottomatic/src/Terrain/Terrain2.c:49-158`
- **Spline dispatch:** `games/ottomatic/src/Terrain/SplineItems.c:47-153`
- **Structs:** `games/ottomatic/src/Headers/structs.h:46-75`

Ottomatic exposes **109 terrain item IDs (0-108)** and a broad spline-prime table. The terrain table includes Human, Atom, PowerupPod, Brain Alien, Onion, Corn, Tomato, Barn, Silo, gates, vehicles, Sprout, Corn Stalk, Rock, Exit Rocket, Slime Pipe, Blob enemies, moving/spinning platforms, Teleporter, Zip Line Post, Mutant, Scientist Human, Grave Stone, Cannon, Bumper Car, Rocket Sled, Lava Platform, Radar Dish, Turret, Brain Boss, Blob Arrow, Neuron Strand, and Brain Port.

Representative parameter findings from the source audit:

| Item | Source-derived params |
| --- | --- |
| Atom | `parm[0]` atom type, `parm[3]` behavior bits |
| PowerupPod | `parm[0]` powerup family, `parm[1]` quantity, `parm[3]` flags |
| Human / Scientist | `parm[0]` human type; spline and terrain variants share the type field |
| Sprout | `parm[0]` plant variant |
| Teleporter | `parm[0]` destination/link ID |
| Zip Line Post | `parm[0]` next-post linkage |
| Bumper Car / gates / turret-like hazards | small integer params drive state/rate selection |

Confirmed spline-prime entries include Human, Brain Alien, Onion, Corn, Tomato, Magnet Monster, Moving Platform, Flamester, Giant Lizard, Mantis, Mutant, Mutant Robot, Scientist Human, Clown, Clown Fish, Strong Man, Jaws Bot, Ice Cube, Hammer Bot, Drill Bot, Swinger Bot, Lava Platform, and Rail Gun.

## Cross-game conclusions

1. **`parm[0]` is the main discriminator almost everywhere.** It most often selects the visible model variant, enemy subtype, linked trigger ID, or weapon/powerup family.
2. **Spline coverage is game-specific, not a universal mirror of terrain items.** Several titles rely on `NilAdd` in the terrain table for spline-only items, so an editor that only trusts terrain add tables will miss real spline content.
3. **Level-specific model selection is common.** Bugdom 1/2, Cro-Mag Rally, Nanosaur 2, and Ottomatic all select meshes through level-specific model groups rather than one global ID space.
4. **Bit-packed behavior in `parm[3]` is rare but important.** Where it exists, it usually controls spawning/regen/water/behavior flags rather than another simple variant index.
5. **Nanosaur 2 terrain JPEGs are bottom-up on disk.** Any editor round-trip that ignores the engine’s vertical flip will import or export upside down textures.

## Known gaps from source

- Some level-specific display-group enums still need external model-group resolution before they can be converted into final editor filenames.
- Several items never read one or more `parm` bytes at add time; some of those parameters may still matter later in move logic.
- A few entries remain intentionally unclear in source tables (`NilAdd`, reserved slots, or multi-module items), so those should stay marked approximate unless another source path proves them.
