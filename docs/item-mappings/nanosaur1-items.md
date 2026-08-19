# Nanosaur 1 item param/model mapping

Legend: `pN=parm[N]`, `p3bN=bit N of parm[3]`, `UF1=ITEM_FLAGS_USER1`.

## Coverage

- Authoritative routing: `games/nanosaur/src/Terrain/Terrain2.c:39-63,195-237`
- Item ID span: `0..19` (`MAX_ITEM_NUM=19`)
- Coverage proof: the table below covers all 20 terrain item IDs from the authoritative add-routine table.

## Terrain items

| ID | Name | Add routine / behavior entrypoint | Model behavior | Params / flags semantics | Citations |
|---:|---|---|---|---|---|
| 0 | My Start Coords | `NilAdd`; consumed by `FindMyStartCoordItem` | No spawned object | `p0` = start aim `0..7` | `games/nanosaur/src/Headers/terrain.h:14`; `games/nanosaur/src/Terrain/Terrain2.c:43,167-179,254-258` |
| 1 | PowerUp | `AddPowerUp -> MovePowerUp -> DoTrig_PowerUp` | `MODEL_GROUP_GLOBAL`; type from POW kind table; starts static then spins in mover | `p0` = kind (`HEATSEEK/LASER/TRIBLAST/HEALTH/SHIELD/NUKE/SONIC`); `p1` = quantity | `games/nanosaur/src/Terrain/Terrain2.c:44`; `games/nanosaur/src/Items/Triggers.c:33-42,235-357` |
| 2 | Tricer enemy | `AddEnemy_Tricer -> MoveTricer` | Skeleton enemy `SKELETON_TYPE_TRICER`; anim `TRICER_ANIM_STAND`; scaled by `TRICER_SCALE`; random Y-rot | `p3b0` = “always add” bypasses per-kind cap | `games/nanosaur/src/Terrain/Terrain2.c:45`; `games/nanosaur/src/Enemies/Enemy_TriCer.c:84-140` |
| 3 | Rex enemy | `AddEnemy_Rex -> MoveRex` | Skeleton enemy `SKELETON_TYPE_REX`; stand/walk init; scaled by `REX_SCALE` | `p3b0` = “always add” | `games/nanosaur/src/Terrain/Terrain2.c:46`; `games/nanosaur/src/Enemies/Enemy_Rex.c:76-129` |
| 4 | Lava patch | `AddLavaPatch -> MoveLavaPatch` | `LEVEL0_MGroupNum_LavaPatch/LEVEL0_MObjType_LavaPatch`; centered to tile; scale `2.0` or `1.0`; undulates; optional fireball spawning | `p3b0` = auto-Y from terrain; `p3b1` = shoot fireballs; `p3b2` = half-size | `games/nanosaur/src/Terrain/Terrain2.c:47`; `games/nanosaur/src/Items/Items.c:86-139,145-229` |
| 5 | Egg | `AddEgg -> MoveEgg` | `LEVEL0_MGroupNum_Egg`, type `Egg1+p0`, scale `.6`, random rot; optional nest | `p0` = egg species; `p3b0` = also `MakeNest(x,z)` | `games/nanosaur/src/Terrain/Terrain2.c:48`; `games/nanosaur/src/Items/Pickups.c:50-99` |
| 6 | Gas vent | `AddGasVent -> MoveGasVent` | `LEVEL0_MGroupNum_GasVent/LEVEL0_MObjType_GasVent`; transparent vent mesh | `p3b0` = `VentHasLimit` | `games/nanosaur/src/Terrain/Terrain2.c:49`; `games/nanosaur/src/Items/Items.c:626-666` |
| 7 | Ptera enemy | `AddEnemy_Ptera -> MovePtera` | Skeleton enemy `SKELETON_TYPE_PTERA`; flies at `FLIGHT_HEIGHT`; optional carried rock changes anim | `p3b0` = “always add”; `p3b1` = rock dropper | `games/nanosaur/src/Terrain/Terrain2.c:50`; `games/nanosaur/src/Enemies/Enemy_Ptera.c:73-120` |
| 8 | Stego enemy | `AddEnemy_Stego -> MoveStego` | Skeleton enemy `SKELETON_TYPE_STEGO`; anim `STEGO_ANIM_STAND`; scaled by `STEGO_SCALE`; random Y-rot | `p3b0` = “always add” | `games/nanosaur/src/Terrain/Terrain2.c:51`; `games/nanosaur/src/Enemies/Enemy_Stego.c:63-117` |
| 9 | Time portal | `AddTimePortal -> MakeTimePortal -> MoveTimePortal` | No direct BG3D model at add site; creates invisible `EVENT_GENRE` portal emitter with portal collision | `p0` = portal number used by `FindTimePortals` | `games/nanosaur/src/Terrain/Terrain2.c:52`; `games/nanosaur/src/Headers/terrain.h:15`; `games/nanosaur/src/Items/TimePortal.c:58-85,96-128` |
| 10 | Tree | `AddTree -> MoveTree` | `LEVEL0_MGroupNum_Tree`, type `Tree1+p0`; random rot; scale from tree-specific base scale table + random | `p0` = variant `0..5` (`fern, stickpalm, bamboo, cypress, main palm, pine palm`) | `games/nanosaur/src/Terrain/Terrain2.c:53`; `games/nanosaur/src/Items/Items.c:389-446` |
| 11 | Boulder | `AddBoulder -> MoveStaticObject` | `LEVEL0_MGroupNum_Boulder/LEVEL0_MObjType_Boulder`; random rot; random scale `1.0..2.0`; triangle collision | None used | `games/nanosaur/src/Terrain/Terrain2.c:54`; `games/nanosaur/src/Items/Items.c:513-544` |
| 12 | Mushroom | `AddMushroom -> MoveStaticObject` | `LEVEL0_MGroupNum_Mushroom/LEVEL0_MObjType_Mushroom`; random rot; random scale `1.0..2.0` | None used | `games/nanosaur/src/Terrain/Terrain2.c:55`; `games/nanosaur/src/Items/Items.c:473-503` |
| 13 | Bush | `AddBush -> MoveStaticObject` | `LEVEL0_MGroupNum_Bush/LEVEL0_MObjType_Bush`; fixed scale `4.2`; random rot | `p3b0` = spawn hidden Tricer via `MakeTriceratops` | `games/nanosaur/src/Terrain/Terrain2.c:56`; `games/nanosaur/src/Items/Items.c:552-598` |
| 14 | Water patch | `AddWaterPatch -> MoveWaterPatch` | `LEVEL0_MGroupNum_WaterPatch/LEVEL0_MObjType_WaterPatch`; transparent patch, scale `2.0`, undulates and UV-scrolls | `p3b0` = auto-Y from terrain | `games/nanosaur/src/Terrain/Terrain2.c:57`; `games/nanosaur/src/Items/Items.c:304-383` |
| 15 | Crystal | `AddCrystal -> MoveCrystal -> DoTrig_Crystal` | `LEVEL0_MGroupNum_Crystal1`; type chosen from crystal-type table; transparent trigger crystal | `p0` = crystal subtype `0..2` | `games/nanosaur/src/Terrain/Terrain2.c:58`; `games/nanosaur/src/Items/Triggers.c:366-457` |
| 16 | Spitter enemy | `AddEnemy_Spitter -> MoveSpitter` | Skeleton enemy `SKELETON_TYPE_SPITTER`; anim `SPITTER_ANIM_WALK`; scaled by `SPITTER_SCALE` | `p3b0` = “always add” | `games/nanosaur/src/Terrain/Terrain2.c:59`; `games/nanosaur/src/Enemies/Enemy_Spitter.c:71-121` |
| 17 | Step stone | `AddStepStone -> MoveStepStone` | `LEVEL0_MGroupNum_StepStone/LEVEL0_MObjType_StepStone`; trigger-only top surface above lava | `p3b0` = reincarnate after sink/fall | `games/nanosaur/src/Terrain/Terrain2.c:60`; `games/nanosaur/src/Items/Triggers.c:463-505` |
| 18 | Rolling boulder | `AddRollingBoulder -> MoveRollingBoulder` | `LEVEL0_MGroupNum_Boulder2/LEVEL0_MObjType_Boulder2`; scale `3.0`; sits until player nears, then rolls/bounces and damage scales with speed | None used | `games/nanosaur/src/Terrain/Terrain2.c:61`; `games/nanosaur/src/Items/Traps.c:50-217` |
| 19 | Spore pod | `AddSporePod -> MoveSporePod` | `LEVEL0_MGroupNum_Pod/LEVEL0_MObjType_Pod`; scale `.5`; undulates, bursts near player, spawns procedural spores | None used | `games/nanosaur/src/Terrain/Terrain2.c:62`; `games/nanosaur/src/Items/Traps.c:226-338` |

## Notes

1. Nanosaur 1 item names are dispatch-table-derived rather than coming from one standalone item enum. Source: `games/nanosaur/src/Terrain/Terrain2.c:41-63`.
2. `FindMyStartCoordItem` contains a stale comment saying “item type #14,” but the authoritative constant is `MAP_ITEM_MYSTARTCOORD = 0`. Source: `games/nanosaur/src/Headers/terrain.h:14`; `games/nanosaur/src/Terrain/Terrain2.c:161-179`.
