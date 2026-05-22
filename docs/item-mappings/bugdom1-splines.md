# Bugdom 1 spline item param/model mapping

## Coverage

- Spline item record: `games/bugdom/src/Headers/structs.h:36-42`
- Authoritative routing: `games/bugdom/src/Terrain/SplineItems.c:45-104`
- Spline ID span: `0..54`
- Coverage proof: the table below addresses all 55 spline item IDs from the authoritative prime table, including placeholder rows.

## Spline items

| ID | Spline item | Prime routine | Model / behavior | placement / p0-p3 / flags | Citations |
|---:|---|---|---|---|---|
| 0 | My Start Coords | `NilPrime` | No spline spawn/model. | No spline behavior. | `games/bugdom/src/Terrain/SplineItems.c:45-49` |
| 1 | xxxxx | `NilPrime` | Placeholder only. | None. | `games/bugdom/src/Terrain/SplineItems.c:50` |
| 2 | Sugar | `NilPrime` | Placeholder only. | None. | `games/bugdom/src/Terrain/SplineItems.c:51` |
| 3 | ENEMY: BOXERFLY | `PrimeEnemy_BoxerFly` | Same boxerfly skeleton as terrain variant; prime seeds spline object and `MoveBoxerFlyOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:52`; `games/bugdom/src/Enemies/Enemy_BoxerFly.c:395-451` |
| 4 | bug test | `NilPrime` | Placeholder/debug slot. | None. | `games/bugdom/src/Terrain/SplineItems.c:53` |
| 5 | Clover | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:54` |
| 6 | Grass | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:55` |
| 7 | Weed | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:56` |
| 8 | Slug enemy | `PrimeEnemy_Slug` | Skeleton slug on spline; `MoveSlugOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:57`; `games/bugdom/src/Enemies/Enemy_Slug.c:51-104` |
| 9 | Fireant enemy | `PrimeEnemy_Ant` | Skeleton ant on spline; `MoveAntOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:58`; `games/bugdom/src/Enemies/Enemy_Ant.c:803-873` |
| 10 | Sunflower | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:59` |
| 11 | Cosmo | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:60` |
| 12 | Poppy | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:61` |
| 13 | Wall End | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:62` |
| 14 | Water Patch | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:63` |
| 15 | FireAnt | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:64` |
| 16 | WaterBug | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:65` |
| 17 | Tree (flight level) | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:66` |
| 18 | Dragonfly | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:67` |
| 19 | Cat Tail | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:68` |
| 20 | Duck Weed | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:69` |
| 21 | Lily Flower | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:70` |
| 22 | Lily Pad | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:71` |
| 23 | Pond Grass | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:72` |
| 24 | Reed | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:73` |
| 25 | Pond Fish Enemy | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:74` |
| 26 | Honeycomb platform | `PrimeHoneycombPlatform` | Hive wood spline platform, not the terrain brick/metal version; moving platform collider. | `placement` used; `p1`=elevation (`0`=>30), `p3 bit1`=small, `bit2`=zigzag. | `games/bugdom/src/Terrain/SplineItems.c:75`; `games/bugdom/src/Items/Items2.c:863-936` |
| 27 | Honey Patch | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:76` |
| 28 | Firecracker | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:77` |
| 29 | Detonator | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:78` |
| 30 | Wax Membrane | `NilPrime` | Placeholder slot only; no prime routine/model found. | None. | `games/bugdom/src/Terrain/SplineItems.c:79` |
| 31 | Mosquito Enemy | `PrimeEnemy_Mosquito` | Same mosquito skeleton as terrain variant; `MoveMosquitoOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:80`; `games/bugdom/src/Enemies/Enemy_Mosquito.c:515-571` |
| 32 | Checkpoint | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:81` |
| 33 | Lawn Door | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:82` |
| 34 | Dock | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:83` |
| 35 | Foot | `PrimeFoot` | Spline foot trap: `SKELETON_TYPE_FOOT`, `FOOT_SCALE`, hurt collider, random start mode. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:84`; `games/bugdom/src/Items/Traps.c:121-189` |
| 36 | ENEMY: SPIDER | `PrimeEnemy_Spider` | Same spider skeleton as terrain variant; `MoveSpiderOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:85`; `games/bugdom/src/Enemies/Enemy_Spider.c:840-894` |
| 37 | ENEMY: CATERPILLER | `PrimeEnemy_Caterpiller` | Skeleton caterpillar on spline; `MoveCaterpillerOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:86`; `games/bugdom/src/Enemies/Enemy_Caterpiller.c:53-103` |
| 38 | ENEMY: FIREFLY | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:87` |
| 39 | Exit Log | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:88` |
| 40 | Root swing | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:89` |
| 41 | Thorn Bush | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:90` |
| 42 | FireFly Target Location | `NilPrime` | Marker only; no spline spawn. | None. | `games/bugdom/src/Terrain/SplineItems.c:91` |
| 43 | Fire Wall | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:92` |
| 44 | Water Valve | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:93` |
| 45 | Honey Tube | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:94` |
| 46 | ENEMY: LARVA | `PrimeEnemy_Larva` | Same larva skeleton as terrain variant; `MoveLarvaOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:95`; `games/bugdom/src/Enemies/Enemy_Larva.c:252-299` |
| 47 | ENEMY: FLYING BEE | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:96` |
| 48 | ENEMY: WORKER BEE | `PrimeEnemy_WorkerBee` | Same worker-bee skeleton as terrain variant; `MoveWorkerBeeOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:97`; `games/bugdom/src/Enemies/Enemy_WorkerBee.c:465-531` |
| 49 | ENEMY: QUEEN BEE | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:98` |
| 50 | Rock Ledge | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:99` |
| 51 | Stump | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:100` |
| 52 | Rolling Boulder | `NilPrime` | No spline behavior. | None. | `games/bugdom/src/Terrain/SplineItems.c:101` |
| 53 | ENEMY: ROACH | `PrimeEnemy_Roach` | Same roach skeleton as terrain variant; `MoveRoachOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:102`; `games/bugdom/src/Enemies/Enemy_Roach.c:330-386` |
| 54 | ENEMY: SKIPPY | `PrimeEnemy_Skippy` | Same skippy skeleton as terrain variant; `MoveSkippyOnSpline`. | Uses `placement`; `parm/flags` unused in prime. | `games/bugdom/src/Terrain/SplineItems.c:103`; `games/bugdom/src/Enemies/Enemy_Skippy.c:224-272` |

## Notes

1. Bugdom 1 spline coverage is broader than a terrain-only read suggests: several moving enemies only become obvious from the spline table.
2. Spline ID `30` is commented as `Wax Membrane` and has no implementation; terrain ID `30` is instead `Hive Door`.
