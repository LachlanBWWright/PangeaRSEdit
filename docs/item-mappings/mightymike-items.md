# Mighty Mike item param/model mapping

## Coverage

- Authoritative routing: `games/mightymike/src/Playfield/Playfield.c:115-174`
- Item record struct (`x,y,type,parm[4]`): `games/mightymike/src/Headers/structures.h:27-42`
- Item ID span: `0..55`
- Coverage proof: the table below explicitly covers all 56 terrain/playfield item IDs from the authoritative routing array.

## Items

| ID | Item | Entrypoint | Model / behavior | Params / flags semantics | Citations |
|---:|---|---|---|---|---|
| 0 | Caveman | `AddEnemy_Caveman` | `2D GroupNum_Caveman/ObjType_Caveman`; enemy. | `parm[0]` = caveman kind; `parm[1]` = aim flag. | `games/mightymike/src/Playfield/Playfield.c:118`; `games/mightymike/src/Enemies/Jurassic/Enemy_CaveMan.c:65-153` |
| 1 | AppearZone | `AddAppearZone` | `BG_GENRE` invisible spawn controller; `MoveAppearZone` spawns Caveman/Mint/FlowerClown by scene. | No add-time params. | `games/mightymike/src/Playfield/Playfield.c:119`; `games/mightymike/src/Misc/Traps.c:58-122` |
| 2 | store | `NilAdd` | No object. | Placeholder only. | `games/mightymike/src/Playfield/Playfield.c:120,1241-1245` |
| 3 | Bunny | `AddBunny` | `2D GroupNum_Bunny/ObjType_Bunny`; collectible bunny. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:121`; `games/mightymike/src/Misc/Bonus.c:153-184` |
| 4 | Triceratops | `AddEnemy_Triceratops` | `2D GroupNum_Triceratops/ObjType_Triceratops`. | `parm[0]` = facing anim; `parm[1]` = travel distance in tiles. | `games/mightymike/src/Playfield/Playfield.c:122`; `games/mightymike/src/Enemies/Jurassic/Enemy_Triceratops.c:43-82` |
| 5 | Turtle | `AddEnemy_Turtle` | `2D GroupNum_Turtle/ObjType_Turtle`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:123`; `games/mightymike/src/Enemies/Jurassic/Enemy_Turtle.c:49-76` |
| 6 | ManEatingPlant | `AddManEatingPlant` | `2D GroupNum_ManEatingPlant/ObjType_ManEatingPlant`; trap. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:124`; `games/mightymike/src/Misc/Traps.c:129-153` |
| 7 | DinoEgg | `AddDinoEgg` | `2D GroupNum_DinoEgg/ObjType_DinoEgg`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:125`; `games/mightymike/src/Enemies/Jurassic/Enemy_DinoEgg.c:58-81` |
| 8 | BabyDino | `AddEnemy_BabyDino` | `2D GroupNum_BabyDino/ObjType_BabyDino`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:126`; `games/mightymike/src/Enemies/Jurassic/Enemy_BabyDino.c:48-84` |
| 9 | Rex | `AddEnemy_Rex` | `2D GroupNum_Rex/ObjType_Rex`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:127`; `games/mightymike/src/Enemies/Jurassic/Enemy_Rex.c:47-77` |
| 10 | ClownBalloon placeholder | `NilAdd` | No object. | Unused placeholder. | `games/mightymike/src/Playfield/Playfield.c:128,1241-1245` |
| 11 | ClownCar | `AddEnemy_ClownCar` | `2D GroupNum_ClownCar/ObjType_ClownCar`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:129`; `games/mightymike/src/Enemies/Clown/Enemy_ClownCar.c:67-99` |
| 12 | JackInTheBox | `AddJackInTheBox` | `2D GroupNum_JackInTheBox/ObjType_JackInTheBox`; hidden trap. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:130`; `games/mightymike/src/Misc/Traps.c:270-295` |
| 13 | Clown | `AddEnemy_Clown` | `2D GroupNum_Clown/ObjType_Clown`. | `parm[0]` selects clown kind branch. | `games/mightymike/src/Playfield/Playfield.c:131`; `games/mightymike/src/Enemies/Clown/Enemy_Clown.c:63-125` |
| 14 | MagicHat | `AddMagicHat` | `2D GroupNum_MagicHat/ObjType_MagicHat`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:132`; `games/mightymike/src/Enemies/Clown/Enemy_HatBunny.c:54-77` |
| 15 | HealthPOW | `AddHealthPOW` | Scene-dependent `2D` food pickup: Jurassic/Clown/Candy/Fairy/Bargain health group/type. | `parm[0]` = subimage/type; scene chooses group/type. | `games/mightymike/src/Playfield/Playfield.c:133`; `games/mightymike/src/Misc/Bonus.c:350-405` |
| 16 | FlowerClown | `AddEnemy_FlowerClown` | `2D GroupNum_FlowerClown/ObjType_FlowerClown`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:134`; `games/mightymike/src/Enemies/Clown/Enemy_FlowerClown.c:58-89` |
| 17 | Teleport | `AddTeleport` | `BG_GENRE` invisible trigger volume; no sprite/model. | `parm[0]` = 1 means destination only (not added); `parm[1]` = teleport match ID; `parm[2]/parm[3]` = half-width/half-height, else default box. | `games/mightymike/src/Playfield/Playfield.c:135`; `games/mightymike/src/Misc/Triggers.c:129-167`; `games/mightymike/src/Headers/objecttypes.h:244-249` |
| 18 | RaceCar | `AddRaceCar` | `2D GroupNum_RaceCar/ObjType_RaceCar`. | `parm[0]` = speed index (`gCarSpeeds`). | `games/mightymike/src/Playfield/Playfield.c:136`; `games/mightymike/src/Enemies/Bargain/RaceCar.c:457-499` |
| 19 | Key | `AddKey` | Scene-dependent `2D` key pickup. | `parm[0]` = key subtype/frame; item is suppressed on easy difficulty. | `games/mightymike/src/Playfield/Playfield.c:137`; `games/mightymike/src/Misc/Bonus.c:412-470` |
| 20 | ClownDoor | `AddClowndoor` | `2D GroupNum_ClownDoor/ObjType_ClownDoor`; trigger door. | `parm[0]` = required key; `ITEM_MEMORY` means already open; suppressed on easy. | `games/mightymike/src/Playfield/Playfield.c:138`; `games/mightymike/src/Misc/Triggers.c:217-249` |
| 21 | CandyMPlatform | `AddCandyMPlatform` | `2D GroupNum_CandyMPlatform/ObjType_CandyMPlatform`; moving platform. | `parm[0]` = platform speed. | `games/mightymike/src/Playfield/Playfield.c:139`; `games/mightymike/src/Misc/Traps.c:341-364` |
| 22 | CandyDoor | `AddCandyDoor` | `2D GroupNum_CandyDoor/ObjType_CandyDoor`; trigger door. | `parm[0]` = required key; `ITEM_MEMORY` means already open; suppressed on easy. | `games/mightymike/src/Playfield/Playfield.c:140`; `games/mightymike/src/Misc/Triggers.c:257-289` |
| 23 | Star | `AddStar` | `2D GroupNum_Star/ObjType_Star`; static solid object. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:141`; `games/mightymike/src/Misc/Traps.c:391-412` |
| 24 | ChocBunny | `AddEnemy_ChocBunny` | `2D GroupNum_ChocBunny/ObjType_ChocBunny`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:142`; `games/mightymike/src/Enemies/Candy/Enemy_ChocBunny.c:51-86` |
| 25 | GBread | `AddEnemy_GBread` | `2D GroupNum_GBread/ObjType_GBread`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:143`; `games/mightymike/src/Enemies/Candy/Enemy_GBread.c:56-89` |
| 26 | Mint | `AddEnemy_Mint` | `2D GroupNum_Mint/ObjType_Mint`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:144`; `games/mightymike/src/Enemies/Candy/Enemy_Mint.c:39-78` |
| 27 | cherrybomb placeholder | `nil` | No object. | Legacy/unused placeholder. | `games/mightymike/src/Playfield/Playfield.c:145` |
| 28 | GBear | `AddEnemy_GBear` | `2D GroupNum_RedGummy/ObjType_RedGummy`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:146`; `games/mightymike/src/Enemies/Candy/Enemy_GummyBear.c:55-84` |
| 29 | my guy init coords | `nil` | No object. | Placeholder only. | `games/mightymike/src/Playfield/Playfield.c:147` |
| 30 | FinishLine placeholder | `nil` | No object. | Placeholder only. | `games/mightymike/src/Playfield/Playfield.c:148` |
| 31 | JurassicDoor | `AddJurassicDoor` | `2D GroupNum_JurassicDoor/ObjType_JurassicDoor`; trigger door. | `parm[0]` = required key; `ITEM_MEMORY` means already open; suppressed on easy. | `games/mightymike/src/Playfield/Playfield.c:149`; `games/mightymike/src/Misc/Triggers.c:297-329` |
| 32 | Carmel | `AddEnemy_Carmel` | `2D GroupNum_Carmel/ObjType_Carmel`. | `parm[0]` selects branch/type. | `games/mightymike/src/Playfield/Playfield.c:150`; `games/mightymike/src/Enemies/Candy/Enemy_Carmel.c:60-139` |
| 33 | WeaponPowerup | `AddWeaponPowerup` | `2D GroupNum_WeaponPOWs/ObjType_WeaponPOWs`. | `parm[0]` = weapon type; `parm[1]` = temporary flag. | `games/mightymike/src/Playfield/Playfield.c:151`; `games/mightymike/src/MeAndMo/Weapon.c:153-182` |
| 34 | MiscPowerup | `AddMiscPowerup` | `2D GroupNum_MiscPOWs/ObjType_MiscPOWs`. | `parm[0]` = misc power type; `parm[1]` = temporary flag. | `games/mightymike/src/Playfield/Playfield.c:152`; `games/mightymike/src/Misc/Bonus.c:534-563` |
| 35 | GumBall | `AddGumBall` | `2D GroupNum_GumBall/ObjType_GumBall`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:153`; `games/mightymike/src/Misc/Traps.c:419-440` |
| 36 | LemonDrop | `AddEnemy_LemonDrop` | `2D GroupNum_LemonDrop/ObjType_LemonDrop`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:154`; `games/mightymike/src/Enemies/Candy/Enemy_LemonDrop.c:44-85` |
| 37 | Giant | `AddEnemy_Giant` | `2D GroupNum_Giant/ObjType_Giant`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:155`; `games/mightymike/src/Enemies/Fairy/Enemy_Giant.c:50-86` |
| 38 | Dragon | `AddEnemy_Dragon` | `2D GroupNum_Dragon/ObjType_Dragon`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:156`; `games/mightymike/src/Enemies/Fairy/Enemy_Dragon.c:47-77` |
| 39 | Witch | `AddEnemy_Witch` | `2D GroupNum_Witch/ObjType_Witch`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:157`; `games/mightymike/src/Enemies/Fairy/Enemy_Witch.c:51-88` |
| 40 | BBWolf | `AddEnemy_BBWolf` | `2D GroupNum_BBWolf/ObjType_BBWolf`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:158`; `games/mightymike/src/Enemies/Fairy/Enemy_BBWolf.c:47-77` |
| 41 | Soldier | `AddEnemy_Soldier` | `2D GroupNum_Soldier/ObjType_Soldier`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:159`; `games/mightymike/src/Enemies/Fairy/Enemy_Soldier.c:48-78` |
| 42 | Muffit | `AddMuffit` | `2D GroupNum_Muffit/ObjType_Muffit`; static fairy object. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:160`; `games/mightymike/src/Misc/Traps.c:470-491` |
| 43 | Spider | `AddEnemy_Spider` | `2D GroupNum_Spider/ObjType_Spider`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:161`; `games/mightymike/src/Enemies/Fairy/Enemy_Spider.c:45-74` |
| 44 | FairyDoor | `AddFairyDoor` | `2D GroupNum_FairyDoor/ObjType_FairyDoor`; trigger door. | `parm[0]` = required key; `ITEM_MEMORY` means already open; suppressed on easy. | `games/mightymike/src/Playfield/Playfield.c:162`; `games/mightymike/src/Misc/Triggers.c:414-447` |
| 45 | Battery | `AddEnemy_Battery` | `2D GroupNum_BadBattery/ObjType_BadBattery`. | `parm[0]` = animation/aim mode. | `games/mightymike/src/Playfield/Playfield.c:163`; `games/mightymike/src/Enemies/Bargain/Enemy_Battery.c:45-89` |
| 46 | PoisonApple | `AddPoisonApple` | `2D GroupNum_FairyHealth/ObjType_FairyHealth`; intentionally reuses health art. | `parm[0]` = displayed subtype/frame. | `games/mightymike/src/Playfield/Playfield.c:164`; `games/mightymike/src/Misc/Traps.c:544-565` |
| 47 | Slinky | `AddEnemy_Slinky` | `2D GroupNum_Slinky/ObjType_Slinky`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:165`; `games/mightymike/src/Enemies/Bargain/Enemy_Slinky.c:47-81` |
| 48 | 8Ball | `AddEnemy_8Ball` | `2D GroupNum_8Ball/ObjType_8Ball`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:166`; `games/mightymike/src/Enemies/Bargain/Enemy_8Ball.c:40-79` |
| 49 | ShipPOW | `AddShipPOW` | `2D GroupNum_SpaceShip/ObjType_SpaceShip`, subimage 8. | No item params used in add. | `games/mightymike/src/Playfield/Playfield.c:167`; `games/mightymike/src/Misc/Bonus.c:820-841` |
| 50 | Robot | `AddEnemy_Robot` | `2D GroupNum_Robot/ObjType_Robot`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:168`; `games/mightymike/src/Enemies/Bargain/Enemy_Robot.c:52-82` |
| 51 | Doggy | `AddEnemy_Doggy` | `2D GroupNum_Doggy/ObjType_Doggy`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:169`; `games/mightymike/src/Enemies/Bargain/Enemy_doggy.c:59-89` |
| 52 | BargainDoor | `AddBargainDoor` | `2D GroupNum_BargainDoor/ObjType_BargainDoor`; trigger door. | `parm[0]` = required key; `ITEM_MEMORY` means already open; suppressed on easy. | `games/mightymike/src/Playfield/Playfield.c:170`; `games/mightymike/src/Misc/Triggers.c:336-368` |
| 53 | Top | `AddEnemy_Top` | `2D GroupNum_Top/ObjType_Top`. | No params in add. | `games/mightymike/src/Playfield/Playfield.c:171`; `games/mightymike/src/Enemies/Bargain/Enemy_Top.c:41-71` |
| 54 | Hydrant | `AddHydrant` | `BG_GENRE` invisible base/controller; `MoveHydrantBase` spawns `2D GroupNum_FireHydrant/ObjType_FireHydrant` water sprites. | `parm[0]` = spray direction index. | `games/mightymike/src/Playfield/Playfield.c:172`; `games/mightymike/src/Misc/Traps.c:571-632` |
| 55 | KeyColor | `AddKeyColor` | `2D GroupNum_KeyColor/ObjType_KeyColor`. | `parm[0]` = subtype/frame. | `games/mightymike/src/Playfield/Playfield.c:173`; `games/mightymike/src/Misc/MiscAnims.c:240-255` |

## Notes

1. Mighty Mike is sprite/theme-driven rather than BG3D display-group-driven.
2. IDs `2`, `10`, `27`, `29`, and `30` are placeholder/no-op entries in the authoritative item table. Source: `games/mightymike/src/Playfield/Playfield.c:120,128,145,147-148,1241-1245`.
