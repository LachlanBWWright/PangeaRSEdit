# Bugdom 2 item param/model mapping

## Coverage

- Terrain item record: `games/bugdom2/Source/Headers/structs.h:226-230`
- Authoritative routing: `games/bugdom2/Source/Terrain/Terrain2.c:47-137`
- Item ID span: `0..85`
- Coverage proof: the table below addresses all 86 terrain item IDs from the authoritative dispatch table, including unlabeled `NilAdd` rows.

## Terrain items

| ID | Item | Add routine | Model / behavior | p0-p3 / flags semantics | Citations |
|---:|---|---|---|---|---|
| 0 | My Start Coords | `NilAdd` | Marker only; no model. Start position/rot read from item list. | `p0`=start facing in eighth-turns; `p1-p3`/flags unused here. | `games/bugdom2/Source/Terrain/Terrain2.c:51,229-242`; `games/bugdom2/Source/Headers/terrain.h:10-19` |
| 1 | snail | `AddSnail` | `SKELETON_TYPE_SNAIL`, scale `1.2`, plus optional chained shell display-group. | `p0`=snail kind `0..19`; `p1`=rot `0..7`; `p2`=key color; `flags USER1`=task completed. | `games/bugdom2/Source/Terrain/Terrain2.c:52`; `games/bugdom2/Source/Items/Snails.c:82-170` |
| 2 | sprinkler head | `AddSprinklerHead` | Level-specific sprinkler base + head display-group, scale `2.5`. | `p0`=rot `0..3`; other params unused. | `games/bugdom2/Source/Terrain/Terrain2.c:53`; `games/bugdom2/Source/Items/Traps.c:89-144` |
| 3 | butterfly pow | `AddButterfly` | Global butterfly body + two wing objects; trigger spawns POW on touch. | `p0`=POW kind `0..12`; `p3 bit0`=regenerate, `bit1`=spawn high; `p1-p2` unused. | `games/bugdom2/Source/Terrain/Terrain2.c:54`; `games/bugdom2/Source/Items/Powerups.c:50-133` |
| 4 | gnome | `AddEnemy_Gnome` | Skeleton enemy `SKELETON_TYPE_GNOME`, scale `5.5`. | `p3 bit0`=always add/bypass kind cap. | `games/bugdom2/Source/Terrain/Terrain2.c:55`; `games/bugdom2/Source/Enemies/Enemy_Gnome.c:38,87-108,120` |
| 5 | daisy | `AddDaisy` | Foliage display-group `FOLIAGE_ObjType_Daisy1+p0`; random scale/rot. | `p0`=daisy variant index. | `games/bugdom2/Source/Terrain/Terrain2.c:56`; `games/bugdom2/Source/Items/Items.c:177-205` |
| 6 | grass | `AddGrass` | Foliage display-group `FOLIAGE_ObjType_Grass1+p0`; random scale/rot. | `p0`=grass variant index. | `games/bugdom2/Source/Terrain/Terrain2.c:57`; `games/bugdom2/Source/Items/Items.c:296-324` |
| 7 | snail shell | `AddSnailShell` | Global snail-shell pickup, scale `SNAIL_SCALE`. | No map params used. | `games/bugdom2/Source/Terrain/Terrain2.c:58`; `games/bugdom2/Source/Items/Snails.c:669-711` |
| 8 | tulip | `AddTulip` | Foliage display-group `FOLIAGE_ObjType_Tulip1+p0`; random scale/rot. | `p0`=tulip variant index. | `games/bugdom2/Source/Terrain/Terrain2.c:59`; `games/bugdom2/Source/Items/Items.c:231-259` |
| 9 | acorn | `AddAcorn` | Global acorn pickup. | `p0`=clover color/type index `0..2`; others unused. | `games/bugdom2/Source/Terrain/Terrain2.c:60`; `games/bugdom2/Source/Items/Pickups.c:285-333` |
| 10 | housefly | `AddEnemy_HouseFly` | Skeleton enemy `SKELETON_TYPE_HOUSEFLY`, scale `.8`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:61`; `games/bugdom2/Source/Enemies/Enemy_HouseFly.c:43,94-116,129` |
| 11 | scarecrow | `AddScarecrow` | If `p0==0`, body/shirt display-group scaffold; else standalone head pickup display-group. | `p0`=part selector (`0` body, nonzero head); `flags USER1`=task complete / head already present. | `games/bugdom2/Source/Terrain/Terrain2.c:62`; `games/bugdom2/Source/Items/Snails.c:803-908` |
| 12 | evil plant | `AddEnemy_EvilPlant` | `EVENT_GENRE` placeholder/spawner only; real grown enemy is spawned later. | No add-site param semantics exposed. | `games/bugdom2/Source/Terrain/Terrain2.c:63`; `games/bugdom2/Source/Enemies/Enemy_EvilPlant.c:94-114,156` |
| 13 | lawn door | `AddDoor` | Level-dependent door display-group; closet `doorColor==0` redirects to `AddSiliconDoor`, nonzero closet becomes diary door. | `p0`=orientation `0..3`; `p1`=door color; `flags USER1`=already open. | `games/bugdom2/Source/Terrain/Terrain2.c:64`; `games/bugdom2/Source/Items/Items.c:362-450`; `games/bugdom2/Source/Items/Items2.c:852-898` |
| 14 | ride ball | `AddRideBall` | Level-specific baseball/ride-ball display-group, trigger mount, scale `40`. | `p0`=initial rot in eighth-turns. | `games/bugdom2/Source/Terrain/Terrain2.c:65`; `games/bugdom2/Source/Player/RideBall.c:48-93` |
| 15 | bowling marble | `AddBowlingMarble` | Playroom marble guts + shell display-group pickup. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:66`; `games/bugdom2/Source/Items/Snails.c:1097-1164` |
| 16 | bowling pins | `AddBowlingPins` | Cluster of pin props; formation rotated by `p0`. | `p0`=formation rotation in eighth-turns. | `games/bugdom2/Source/Terrain/Terrain2.c:67`; `games/bugdom2/Source/Items/Snails.c:1320-1374` |
| 17 | brick | `AddBrick` | Level-specific brick display-group (garden/sidewalk), scale `2.5`. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:68`; `games/bugdom2/Source/Items/Items.c:513-551` |
| 18 | post | `AddPost` | Level-specific post display-group; type/scale vary by level. | `p0`=post variant/type. | `games/bugdom2/Source/Terrain/Terrain2.c:69`; `games/bugdom2/Source/Items/Items.c:558-615` |
| 19 | chipmunk | `AddChipmunk` | `SKELETON_TYPE_CHIPMUNK`, scale `3.0`; dialog/trigger NPC that may chain a POW. | `p0`=rot in eighth-turns; `p1`=chipmunk kind; `p2`=aux/checkpoint; `flags USER1`=task completed. | `games/bugdom2/Source/Terrain/Terrain2.c:70`; `games/bugdom2/Source/Items/Chipmunk.c:76-200` |
| 20 | shrub root | `AddShrubRoot` | Foliage shrub-root display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:71`; `games/bugdom2/Source/Items/Items.c:328-353` |
| 21 | pebble | `AddPebble` | Level-specific stone display-group `LargeStone+p0`; random scale/rot. | `p0`=stone variant. | `games/bugdom2/Source/Terrain/Terrain2.c:72`; `games/bugdom2/Source/Items/Items.c:621-660` |
| 22 | snake generator | `AddSnakeGenerator` | `EVENT_GENRE` snake spawner; no direct model. | No add-site params documented. | `games/bugdom2/Source/Terrain/Terrain2.c:73`; `games/bugdom2/Source/Enemies/Enemy_Snake.c:161-182` |
| 23 | pool coping | `AddPoolCoping` | Sidewalk coping/corner display-group sized to exact terrain rect; collision depends on orientation/corner. | `p0`=rot `0..3`; `p3 bit0`=corner piece. | `games/bugdom2/Source/Terrain/Terrain2.c:74`; `games/bugdom2/Source/Items/Items.c:667-733` |
| 24 | pool leaf | `AddPoolLeaf` | Sidewalk leaf moving-platform trigger; may chain red key. | `p3 bit0`=attach red key; others unused. | `games/bugdom2/Source/Terrain/Terrain2.c:75`; `games/bugdom2/Source/Items/Items.c:739-806` |
| 25 | ?????? | `NilAdd` | Unlabeled terrain slot; no terrain add. Spline table uses ID 25 for Bumble Bee. | Unknown terrain semantics. | `games/bugdom2/Source/Terrain/Terrain2.c:76`; `games/bugdom2/Source/Terrain/SplineItems.c:72` |
| 26 | squish berry | `AddSquishBerry` | Either splat decal-like prop or berry pickup. | `flags USER1`=already squished; no explicit `parm` usage in add. | `games/bugdom2/Source/Terrain/Terrain2.c:77`; `games/bugdom2/Source/Items/Snails.c:1610-1675` |
| 27 | dog house | `AddDogHouse` | Sidewalk doghouse display-group trigger. | `p0`=orientation quarter-turn. | `games/bugdom2/Source/Terrain/Terrain2.c:78`; `games/bugdom2/Source/Items/Items.c:885-911` |
| 28 | windmill | `AddWindmill` | Sidewalk windmill base + blades display-group. | `p0`=rot `0..3`; also selects collision-axis layout. | `games/bugdom2/Source/Terrain/Terrain2.c:79`; `games/bugdom2/Source/Items/Traps.c:297-374` |
| 29 | rose | `AddRose` | Foliage rose display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:80`; `games/bugdom2/Source/Items/Items.c:263-291` |
| 30 | tulip pot | `AddTulipPot` | Sidewalk tulip-pot display-group. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:81`; `games/bugdom2/Source/Items/Items.c:937-963` |
| 31 | beach ball | `AddBeachBall` | Level-specific beach-ball display-group (sidewalk/playroom). | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:82`; `games/bugdom2/Source/Items/Items.c:969-1019` |
| 32 | chlorine float | `AddChlorineFloat` | Sidewalk chlorine-float display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:83`; `games/bugdom2/Source/Items/Items.c:1061-1086` |
| 33 | pool ring float | `AddPoolRingFloat` | Sidewalk pool-ring display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:84`; `games/bugdom2/Source/Items/Items.c:1128-1158` |
| 34 | drain pipe | `AddDrainPipe` | Sidewalk drain-pipe display-group plus chained grate. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:85`; `games/bugdom2/Source/Items/Items.c:1189-1238` |
| 35 | powerup | `AddPOW` | Spawns `MakePOW(p0)` above highest collision; model depends on POW kind. | `p0`=POW kind (`POW_KIND_*`). | `games/bugdom2/Source/Terrain/Terrain2.c:86`; `games/bugdom2/Source/Items/Powerups.c:274-384,577-591`; `games/bugdom2/Source/Headers/items.h:156-171` |
| 36 | firecracker | `AddFirecracker` | Static global firecracker prop. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:87`; `games/bugdom2/Source/Items/Traps.c:517-536` |
| 37 | glass bottle | `AddGlassBottle` | Sidewalk/park bottle display-group, cracks over time. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:88`; `games/bugdom2/Source/Items/Items.c:1244-1277` |
| 38 | flea enemy | `AddEnemy_Flea` | Skeleton enemy `SKELETON_TYPE_FLEA`, scale `1.8`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:89`; `games/bugdom2/Source/Enemies/Enemy_Flea.c:48,133-158,172` |
| 39 | tick enemy | `AddEnemy_Tick` | Skeleton enemy `SKELETON_TYPE_TICK`, scale `1.8`. | No add-site params documented. | `games/bugdom2/Source/Terrain/Terrain2.c:90`; `games/bugdom2/Source/Enemies/Enemy_Tick.c:46,108-121,135` |
| 40 | slot car | `NilAdd` | Terrain slot exists, but actual slot cars are spline-only. | No terrain behavior. | `games/bugdom2/Source/Terrain/Terrain2.c:91`; `games/bugdom2/Source/Terrain/SplineItems.c:87` |
| 41 | letter block | `AddLetterBlock` | Playroom letter-block display-group `LetterBlock1+p0`; push-block. | `p0`=letter/block variant. | `games/bugdom2/Source/Terrain/Terrain2.c:92`; `games/bugdom2/Source/Items/Items2.c:50-84` |
| 42 | mouse trap | `AddMouseTrap` | Skeleton mousetrap `SKELETON_TYPE_MOUSETRAP`, scale `3.5`; may chain bait/mouse. | `p0`=rot `0..3`; `p3 bit0`=primed, `bit1`=drowning; `flags USER1`=mouse already freed. | `games/bugdom2/Source/Terrain/Terrain2.c:93`; `games/bugdom2/Source/Items/Traps.c:719-840` |
| 43 | toy solider | `AddEnemy_ToySoldier` | Skeleton enemy `SKELETON_TYPE_TOYSOLDIER`, scale `1.5`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:94`; `games/bugdom2/Source/Enemies/Enemy_ToySoldier.c:48,105-127,140` |
| 44 | finish line | `AddFinishLine` | Playroom finish-line display-group. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:95`; `games/bugdom2/Source/Items/SlotCar.c:865-884` |
| 45 | otto enemy | `AddEnemy_Otto` | Skeleton enemy `SKELETON_TYPE_OTTO`, scale `3.5`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:96`; `games/bugdom2/Source/Enemies/Enemy_Otto.c:48,114-136,150` |
| 46 | puzzle | `AddPuzzle` | Playroom puzzle body (`p0==0`) or puzzle-piece pickup (`p0>0`). | `p0`=part index (`0` main body, else piece). | `games/bugdom2/Source/Terrain/Terrain2.c:97`; `games/bugdom2/Source/Items/Snails2.c:49-147` |
| 47 | lego wall | `AddLegoWall` | Playroom lego wall/brick display-group. | `p0`=type `0..5`; `p1`=rot; `p3 bit0`=random color brick / random rot for loose bricks. | `games/bugdom2/Source/Terrain/Terrain2.c:98`; `games/bugdom2/Source/Items/Items2.c:368-440` |
| 48 | flashlight | `AddFlashLight` | Closet flashlight display-group plus glowing light-beam child and sparkle. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:99`; `games/bugdom2/Source/Items/Items2.c:447-519` |
| 49 | d-cell | `AddDCell` | Playroom D-cell display-group static prop. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:100`; `games/bugdom2/Source/Items/Items2.c:650-677` |
| 50 | crayon | `AddCrayon` | Playroom crayon display-group; random color filter and terrain-aligned collision boxes. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:101`; `games/bugdom2/Source/Items/Items2.c:540-646` |
| 51 | ant hill | `AddAntHill` | Balsa anthill display-group, scale `2.0`. | `flags USER1`=already blown up/hidden. | `games/bugdom2/Source/Terrain/Terrain2.c:102`; `games/bugdom2/Source/Player/BalsaPlane.c:636-674` |
| 52 | dragonfly | `AddEnemy_Dragonfly` | Skeleton enemy `SKELETON_TYPE_DRAGONFLY`, scale `.9` on balsa or half-scale elsewhere. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:103`; `games/bugdom2/Source/Enemies/Enemy_DragonFly.c:41,89-145` |
| 53 | cloud | `AddCloud` | Balsa cloud display-group, scale `6..12`, render-only style flags. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:104`; `games/bugdom2/Source/Player/BalsaPlane.c:780-806` |
| 54 | frog | `AddEnemy_Frog` | Skeleton enemy `SKELETON_TYPE_FROG`, scale `2.0`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:105`; `games/bugdom2/Source/Enemies/Enemy_Frog.c:34,64-89,102` |
| 55 | box | `AddCardboardBox` | Closet cardboard-box display-group sized to special map rect; optional stack height. | `p0`=box type `0..3`; `p1`=stack level. | `games/bugdom2/Source/Terrain/Terrain2.c:106`; `games/bugdom2/Source/Items/Items2.c:688-728` |
| 56 | trampoline | `AddTrampoline` | Closet trampoline base + web trigger. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:107`; `games/bugdom2/Source/Items/Traps.c:1081-1136` |
| 57 | moth ball | `AddMothBall` | Closet mothball pickup display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:108`; `games/bugdom2/Source/Items/Pickups.c:431-474` |
| 58 | vacuume | `NilAdd` | Terrain slot exists, but vacuum is spline-only. | No terrain behavior. | `games/bugdom2/Source/Terrain/Terrain2.c:109`; `games/bugdom2/Source/Terrain/SplineItems.c:105` |
| 59 | pci card | `AddClosetWall` | Closet wall-prop display-group `CLOSET_ObjType_PCICard+p1`; also reused for books. | `p0`=rot in quarter-turns; `p1`=type `0..2`. | `games/bugdom2/Source/Terrain/Terrain2.c:110`; `games/bugdom2/Source/Items/Items2.c:773-806` |
| 60 | moth | `AddEnemy_Moth` | Skeleton moth `SKELETON_TYPE_MOTH`, scale `.7`; target-tagged entries are skipped. | `p0`=target ID; `p3 bit0`=target-marker entry. | `games/bugdom2/Source/Terrain/Terrain2.c:111`; `games/bugdom2/Source/Enemies/Enemy_Moth.c:82-125` |
| 61 | computer bug | `AddEnemy_ComputerBug` | Skeleton enemy `SKELETON_TYPE_COMPUTERBUG`, scale `1.8`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:112`; `games/bugdom2/Source/Enemies/Enemy_ComputerBug.c:41,97-119,133` |
| 62 | silicon part | `AddSiliconPart` | Closet silicon-chip pickup display-group (`Chip1 + p0`), scale `SILICON_DOOR_SCALE`. | `p0`=chip part (`0/1`). | `games/bugdom2/Source/Terrain/Terrain2.c:113`; `games/bugdom2/Source/Items/Pickups.c:678-744` |
| 63 | (unlabeled terrain slot) | `NilAdd` | Unlabeled terrain slot; no terrain add. Spline table uses ID 63 for Hanger. | Unknown terrain semantics. | `games/bugdom2/Source/Terrain/Terrain2.c:114`; `games/bugdom2/Source/Terrain/SplineItems.c:110` |
| 64 | book stack | `AddBookStack` | Closet book-stack display-group `FlatBook+p0`; type 2 uses reduced scale. | `p0`=stack type `0..2`; `p1`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:115`; `games/bugdom2/Source/Items/Items2.c:809-844` |
| 65 | roach enemy | `AddEnemy_Roach` | Skeleton enemy `SKELETON_TYPE_ROACH`, scale `1.7`. | `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:116`; `games/bugdom2/Source/Enemies/Enemy_Roach.c:47,123-180` |
| 66 | shoe box | `AddShoeBox` | Closet shoebox display-group sized to map rect; can be stacked. | `p0`=rot `0..3`; `p1`=stack level. | `games/bugdom2/Source/Terrain/Terrain2.c:117`; `games/bugdom2/Source/Items/Items2.c:731-770` |
| 67 | picture frame | `AddPictureFrame` | Closet picture-frame display-group `PictureFrame_Brian+p0`. | `p0`=frame art/variant; `p1`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:118`; `games/bugdom2/Source/Items/Items2.c:1116-1143` |
| 68 | ant enemy | `AddEnemy_Ant` | Skeleton enemy `SKELETON_TYPE_ANT`, scale `1.1`, carrying food based on `p0`. | `p0`=food type; `p3 bit0`=always add. | `games/bugdom2/Source/Terrain/Terrain2.c:119`; `games/bugdom2/Source/Enemies/Enemy_Ant.c:48,103-180` |
| 69 | fish enemy | `AddEnemy_PondFish` | Skeleton fish `SKELETON_TYPE_FISH`, scale `4.0`. | No add-site params used. | `games/bugdom2/Source/Terrain/Terrain2.c:120`; `games/bugdom2/Source/Enemies/Enemy_PondFish.c:96-149` |
| 70 | lily pad | `AddLilyPad` | Park lily-pad display-group on water, wobbling platform-ish collider. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:121`; `games/bugdom2/Source/Items/Items2.c:1147-1180` |
| 71 | cat tail | `AddCatTail` | Park cattail display-group. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:122`; `games/bugdom2/Source/Items/Items2.c:1205-1232` |
| 72 | bubbler | `AddBubbler` | `EVENT_GENRE` bubbler emitter only; no direct model. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:123`; `games/bugdom2/Source/Effects/Particles.c:1384-1435` |
| 73 | platform flower | `AddPlatformFlower` | Park flower display-group `ShortFlower+p0`, mplatform with per-type collision. | `p0`=flower height/type `0..2`. | `games/bugdom2/Source/Terrain/Terrain2.c:124`; `games/bugdom2/Source/Items/Items2.c:1236-1291` |
| 74 | fishing lure | `AddFishingLure` | Park lure display-group on water; trigger/mplatform; wobbles and ripples. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:125`; `games/bugdom2/Source/Items/Snails2.c:379-498` |
| 75 | silvereware | `AddSilverware` | Park silverware display-group `Fork+p0`; shadowed static prop. | `p0`=silverware variant; `p1`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:126`; `games/bugdom2/Source/Items/Items2.c:1294-1324` |
| 76 | picnic basket | `AddPicnicBasket` | Park picnic-basket display-group trigger. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:127`; `games/bugdom2/Source/Items/Snails2.c:504-533` |
| 77 | kindling | `AddKindling` | Park leaf/twig pickup display-group. | `p0`=`0` leaf / `1` twig. | `games/bugdom2/Source/Terrain/Terrain2.c:128`; `games/bugdom2/Source/Items/BeeHive.c:232-294` |
| 78 | bee hive | `AddBeeHive` | Park hive display-group plus chained door; later releases bees. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:129`; `games/bugdom2/Source/Items/BeeHive.c:47-101` |
| 79 | soda can | `AddSodaCan` | Garbage soda can display-group plus chained tab pickup and cap. | No item params used. | `games/bugdom2/Source/Terrain/Terrain2.c:130`; `games/bugdom2/Source/Items/Items3.c:57-126` |
| 80 | veggies | `AddVeggie` | Garbage veggie display-group `Banana+p0`, sunk/tilted into terrain. | `p0`=veggie variant `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:131`; `games/bugdom2/Source/Items/Items3.c:357-400` |
| 81 | jar | `AddJar` | Garbage jar display-group `Jar+p0`, sunk/tilted. | `p0`=jar variant `0..1`. | `games/bugdom2/Source/Terrain/Terrain2.c:132`; `games/bugdom2/Source/Items/Items3.c:404-448` |
| 82 | tin can | `AddTinCan` | Garbage tin-can display-group; upright or side-laid depending on type. | `p0`=`0` upright random rot / `1` side-laid using `p1` rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:133`; `games/bugdom2/Source/Items/Items3.c:452-507` |
| 83 | detergent | `AddDetergent` | Garbage detergent display-group, sunk into terrain. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:134`; `games/bugdom2/Source/Items/Items3.c:511-549` |
| 84 | box wall | `AddBoxWall` | Garbage box-wall display-group, sunk/tilted. | `p0`=rot `0..3`. | `games/bugdom2/Source/Terrain/Terrain2.c:135`; `games/bugdom2/Source/Items/Items3.c:554-592` |
| 85 | glider part | `AddGliderPart` | Garbage glider part display-group `Glider+p0`; fuselage chains rubber band, wheel/prop are pickups. | `p0`=`0` fuselage / `1` wheel / `2` propeller. | `games/bugdom2/Source/Terrain/Terrain2.c:136`; `games/bugdom2/Source/Items/Items3.c:597-690` |

## Notes

1. Door scale is explicitly level-dependent in source: standard doors are `1.8x`, while Closet diary doors are `6.0x`.
2. Bugdom 2 uses many level-specific object families; mapping by item type alone is not sufficient.
3. Terrain IDs `25` and `63` are real `NilAdd` rows and should not be treated as regular terrain-spawned items.
