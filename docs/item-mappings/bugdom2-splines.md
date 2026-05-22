# Bugdom 2 spline item param/model mapping

## Coverage

- Spline item record: `games/bugdom2/Source/Headers/structs.h:44-50`
- Authoritative routing: `games/bugdom2/Source/Terrain/SplineItems.c:43-116`
- Spline ID span: `0..68`
- Coverage proof: the table below addresses all 69 spline item IDs from the authoritative prime table.

## Spline items

| ID | Spline item | Prime routine | Model / behavior | placement / p0-p3 / flags | Citations |
|---:|---|---|---|---|---|
| 0 | My Start Coords | `NilPrime` | No spline spawn/model. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:47` |
| 1 | snail | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:48`; `games/bugdom2/Source/Terrain/Terrain2.c:52` |
| 2 | sprinkler head | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:49`; `games/bugdom2/Source/Terrain/Terrain2.c:53` |
| 3 | butterfly pow | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:50`; `games/bugdom2/Source/Terrain/Terrain2.c:54` |
| 4 | gnome | `PrimeEnemy_Gnome` | Same gnome skeleton as terrain add; spline prime seeds placement and `MoveGnomeOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:51`; `games/bugdom2/Source/Enemies/Enemy_Gnome.c:414-447` |
| 5 | daisy | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:52`; `games/bugdom2/Source/Terrain/Terrain2.c:56` |
| 6 | grass | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:53`; `games/bugdom2/Source/Terrain/Terrain2.c:57` |
| 7 | snail shell | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:54`; `games/bugdom2/Source/Terrain/Terrain2.c:58` |
| 8 | tulip | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:55`; `games/bugdom2/Source/Terrain/Terrain2.c:59` |
| 9 | acorn | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:56`; `games/bugdom2/Source/Terrain/Terrain2.c:60` |
| 10 | housefly | `PrimeEnemy_HouseFly` | Same housefly skeleton as terrain add; spline prime seeds placement and `MoveHouseFlyOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:57`; `games/bugdom2/Source/Enemies/Enemy_HouseFly.c:512-547` |
| 11-24 | scarecrow .. pool leaf | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:58-71` |
| 25 | bumble bee | `PrimeBumbleBee` | `SKELETON_TYPE_BUMBLEBEE`, scale `1.3`, on spline; title path variant also chains `SKELETON_TYPE_HOBOBAG`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:72`; `games/bugdom2/Source/Items/Items2.c:190-262` |
| 26-37 | squish berry .. glass bottle | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:73-84` |
| 38 | flea enemy | `PrimeEnemy_Flea` | Same flea skeleton as terrain add; spline prime seeds placement and `MoveFleaOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:85`; `games/bugdom2/Source/Enemies/Enemy_Flea.c:748-783` |
| 39 | tick enemy | `PrimeEnemy_Tick` | Same tick skeleton as terrain add; spline prime seeds placement and `MoveTickOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:86`; `games/bugdom2/Source/Enemies/Enemy_Tick.c:637-672` |
| 40 | slot car | `PrimeSlotCar` | Playroom slot car display-group `SlotCarRed+p0`, scale `4.5`, plus front/rear wheel children; spline racer. | `p0`=car number/color; cars start at spline index 0, ignoring authored `placement`. | `games/bugdom2/Source/Terrain/SplineItems.c:87`; `games/bugdom2/Source/Items/SlotCar.c:85-194` |
| 41-42 | letter block / mouse trap | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:88-89` |
| 43 | toy solider | `PrimeEnemy_ToySoldier` | Same toy-soldier skeleton as terrain add; spline prime seeds placement and `MoveToySoldierOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:90`; `games/bugdom2/Source/Enemies/Enemy_ToySoldier.c:508-541` |
| 44 | finish line | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:91`; `games/bugdom2/Source/Terrain/Terrain2.c:95` |
| 45 | otto enemy | `PrimeEnemy_Otto` | Same Otto skeleton as terrain add; spline prime seeds placement and `MoveOttoOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:92`; `games/bugdom2/Source/Enemies/Enemy_Otto.c:525-558` |
| 46-51 | puzzle .. ant hill | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:93-98` |
| 52 | dragonfly | `PrimeEnemy_Dragonfly` | Same dragonfly skeleton as terrain add; spline prime seeds placement and `MoveDragonflyOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:99`; `games/bugdom2/Source/Enemies/Enemy_DragonFly.c:462-495` |
| 53-57 | cloud .. moth ball | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:100-104` |
| 58 | vacuume | `PrimeVacuume` | Closet vacuum display-group on spline, scale `2.0`, plus child light; impassable moving hazard. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:105`; `games/bugdom2/Source/Items/Traps.c:1236-1306` |
| 59 | pci card | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:106`; `games/bugdom2/Source/Terrain/Terrain2.c:110` |
| 60 | moth enemy | `PrimeMothPath` | No visible object; stores shared moth path reference only. | `p0`=path number; `placement/p1-p3/flags` unused. | `games/bugdom2/Source/Terrain/SplineItems.c:107`; `games/bugdom2/Source/Enemies/Enemy_Moth.c:587-597` |
| 61 | computer bug enemy | `PrimeEnemy_ComputerBug` | Same computer-bug skeleton as terrain add; spline prime seeds placement and `MoveComputerBugOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:108`; `games/bugdom2/Source/Enemies/Enemy_ComputerBug.c:465-498` |
| 62 | silicon part | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:109`; `games/bugdom2/Source/Terrain/Terrain2.c:113` |
| 63 | hanger | `PrimeHanger` | Repeats hanger display-group instances along spline, each with chained red-clover trigger child. | Ignores `placement`; generated by stepping spline indices internally; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:110`; `games/bugdom2/Source/Items/Snails2.c:236-326` |
| 64 | book stack | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:111`; `games/bugdom2/Source/Terrain/Terrain2.c:115` |
| 65 | roach enemy | `PrimeEnemy_Roach` | Same roach skeleton as terrain add; spline prime seeds placement and `MoveRoachOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:112`; `games/bugdom2/Source/Enemies/Enemy_Roach.c:672-707` |
| 66-67 | shoe box / picture frame | `NilPrime` | No spline behavior. | None. | `games/bugdom2/Source/Terrain/SplineItems.c:113-114` |
| 68 | ant enemy | `PrimeEnemy_Ant` | Same ant skeleton as terrain add; spline prime seeds placement and `MoveAntOnSpline`. | Uses `placement`; `p0`=food type; other `parm/flags` unused in prime. | `games/bugdom2/Source/Terrain/SplineItems.c:115`; `games/bugdom2/Source/Enemies/Enemy_Ant.c:544-578` |

## Notes

1. Bugdom 2 has real spline-only IDs: `25` Bumble Bee, `40` Slot Car, `58` Vacuum, and `63` Hanger.
2. Many `NilPrime` rows are unnamed in the source table, so the terrain-table name is the only stable label for those numeric slots.
