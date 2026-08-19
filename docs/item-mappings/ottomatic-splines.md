# Ottomatic spline item param/model mapping

## Coverage

- Authoritative routing: `games/ottomatic/src/Terrain/SplineItems.c:45-153`
- Spline item struct: `games/ottomatic/src/Headers/structs.h:46-66`
- Dispatch loop: `games/ottomatic/src/Terrain/SplineItems.c:163-208`
- Spline ID span: `0..103`
- Coverage proof: the table below explicitly covers all 104 spline item IDs from the authoritative routing array.

## Spline items

| ID(s) | Spline item(s) | Entrypoint | Model / behavior | Params / flags semantics | Citations |
|---|---|---|---|---|---|
| 0-3 | start coord / unused / squooshy placeholder | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:49-52,219-224` |
| 4 | Human | `PrimeHuman` | `SKEL` human on spline; abductable NPC with `STATUS_BIT_ONSPLINE`. | `placement` = spline start; `parm[0]` = human type. | `games/ottomatic/src/Terrain/SplineItems.c:53,163-208`; `games/ottomatic/src/Items/Humans.c:243-305` |
| 5-6 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:54-55,219-224` |
| 7 | BrainAlien | `PrimeEnemy_BrainAlien` | `SKEL SKELETON_TYPE_BRAINALIEN` spline enemy. | Uses `placement`; no item-specific params in prime. | `games/ottomatic/src/Terrain/SplineItems.c:56`; `games/ottomatic/src/Enemies/Enemy_BrainAlien.c:597-667,611` |
| 8 | Onion | `PrimeEnemy_Onion` | `SKEL SKELETON_TYPE_ONION` spline enemy. | Uses `placement`; no extra prime params. | `games/ottomatic/src/Terrain/SplineItems.c:57`; `games/ottomatic/src/Enemies/Farm/Enemy_Onion.c:531-598,545` |
| 9 | Corn | `PrimeEnemy_Corn` | `SKEL SKELETON_TYPE_CORN` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:58`; `games/ottomatic/src/Enemies/Farm/Enemy_Corn.c:360-424,374` |
| 10 | Tomato | `PrimeEnemy_Tomato` | `SKEL SKELETON_TYPE_TOMATO` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:59`; `games/ottomatic/src/Enemies/Farm/Enemy_Tomato.c:473-541,487` |
| 11-34 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:60-83,219-224` |
| 35 | MagnetMonster | `PrimeMagnetMonster` | `DG(level)` `SLIME_ObjType_MagnetMonster`; spline-bound multipart hazard. | `placement` used; `parm[0]` = monster ID. | `games/ottomatic/src/Terrain/SplineItems.c:84`; `games/ottomatic/src/Items/Traps.c:841-921` |
| 36-39 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:85-88,219-224` |
| 40 | MovingPlatform | `PrimeMovingPlatform` | `DG(level)` `BLOBBOSS_ObjType_MovingPlatform_Blue + parm[0]`; spline platform. | `parm[0]` = platform type; `placement` used. | `games/ottomatic/src/Terrain/SplineItems.c:89`; `games/ottomatic/src/Items/Items.c:1577-1630` |
| 41-48 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:90-97,219-224` |
| 49 | Flamester | `PrimeEnemy_Flamester` | Spline-bound Flamester enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:98`; `games/ottomatic/src/Enemies/FireIce/Enemy_Flamester.c:354-392` |
| 50 | GiantLizard | `PrimeEnemy_GiantLizard` | `SKEL SKELETON_TYPE_GIANTLIZARD` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:99`; `games/ottomatic/src/Enemies/Jungle/Enemy_GiantLizard.c:621-685,635` |
| 51 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:100,219-224` |
| 52 | Mantis | `PrimeEnemy_Mantis` | `SKEL SKELETON_TYPE_MANTIS` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:101`; `games/ottomatic/src/Enemies/Jungle/Enemy_Mantis.c:389-452,404` |
| 53-58 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:102-107,219-224` |
| 59 | Mutant | `PrimeEnemy_Mutant` | `SKEL SKELETON_TYPE_MUTANT` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:108`; `games/ottomatic/src/Enemies/Apocalypse/Enemy_Mutant.c:496-560,510` |
| 60 | MutantRobot | `PrimeEnemy_MutantRobot` | `SKEL SKELETON_TYPE_MUTANTROBOT` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:109`; `games/ottomatic/src/Enemies/Apocalypse/Enemy_MutantRobot.c:467-529,481` |
| 61 | HumanScientist | `PrimeHumanScientist` | Wrapper around `PrimeHuman`. | Forces `parm[0]=HUMAN_TYPE_SCIENTIST`. | `games/ottomatic/src/Terrain/SplineItems.c:110`; `games/ottomatic/src/Items/Humans.c:1174-1178` |
| 62-77 | proximity mine .. tire bumper | `NilPrime` | No spline object for these IDs. | None. | `games/ottomatic/src/Terrain/SplineItems.c:111-126,219-224` |
| 78 | Clown | `PrimeEnemy_Clown` | `SKEL SKELETON_TYPE_CLOWN` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:127`; `games/ottomatic/src/Enemies/Cloud/Enemy_Clown.c:409-474,423` |
| 79 | ClownFish | `PrimeEnemy_ClownFish` | `SKEL SKELETON_TYPE_CLOWNFISH` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:128`; `games/ottomatic/src/Enemies/Cloud/Enemy_ClownFish.c:70-136,85` |
| 80 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:129,219-224` |
| 81 | StrongMan | `PrimeEnemy_StrongMan` | `SKEL SKELETON_TYPE_STRONGMAN` spline enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:130`; `games/ottomatic/src/Enemies/Cloud/Enemy_StrongMan.c:411-474,425` |
| 82-88 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:131-137,219-224` |
| 89 | JawsBot | `PrimeEnemy_JawsBot` | Multipart spline bot; body/jaw/wheels assembled as display-group parts. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:138`; `games/ottomatic/src/Enemies/FireIce/Enemy_JawsBot.c:429-470,108,152,163` |
| 90-91 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:139-140,219-224` |
| 92 | IceCube | `PrimeEnemy_IceCube` | Spline-bound IceCube enemy. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:141`; `games/ottomatic/src/Enemies/FireIce/Enemy_IceCube.c:495-529,150` |
| 93 | HammerBot | `PrimeEnemy_HammerBot` | Multipart spline bot; body/hammer/wheels display-group parts. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:142`; `games/ottomatic/src/Enemies/FireIce/Enemy_HammerBot.c:594-635,116,159,170` |
| 94 | DrillBot | `PrimeEnemy_DrillBot` | Multipart spline bot; body/drill/wheels display-group parts. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:143`; `games/ottomatic/src/Enemies/FireIce/Enemy_DrillBot.c:535-576,120,163,174` |
| 95 | SwingerBot | `PrimeEnemy_SwingerBot` | Multipart spline bot; body/treads/gears/pivot/mace display-group parts. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:144`; `games/ottomatic/src/Enemies/FireIce/Enemy_SwingerBot.c:543-584,115,156,167,176,185` |
| 96-97 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:145-146,219-224` |
| 98 | LavaPlatform | `PrimeLavaPlatform` | `DG(level)` `FIREICE_ObjType_LavaPlatform`; spline platform. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:147`; `games/ottomatic/src/Items/Volcano.c:847-897` |
| 99-102 | unused | `NilPrime` | No spline object. | None. | `games/ottomatic/src/Terrain/SplineItems.c:148-151,219-224` |
| 103 | RailGun | `PrimeRailGun` | `DG(level)` `SAUCER_ObjType_RailGun`; spline hazard. | Uses `placement`. | `games/ottomatic/src/Terrain/SplineItems.c:152`; `games/ottomatic/src/Items/Traps2.c:179-269` |

## Notes

1. Ottomatic’s spline table is large and includes several movers that do not exist in the terrain-add table, including `MagnetMonster`, `MovingPlatform`, and `RailGun`.
2. Large unused ranges are still documented here because they are present in the authoritative spline routing array and therefore must be accounted for in any completeness audit.
