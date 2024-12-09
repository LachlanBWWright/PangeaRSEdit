export enum ItemType {
  StartCoords, // My Start Coords
  Snail, // snail
  SprinklerHead, // sprinkler head
  Butterfly, // butterfly pow
  Enemy_Gnome, // gnome
  Daisy, // daisy
  Grass, // grass
  SnailShell, // snail shell
  Tulip, // tulip
  Acorn, // acorn
  Enemy_HouseFly, // 10: housefly
  Scarecrow, // 11: scarecrow
  Enemy_EvilPlant, // 12: evil plant
  Door, // 13: lawn door
  RideBall, // 14: ride ball
  BowlingMarble, // 15: bowling marble
  BowlingPins, // 16: bowling pins
  Brick, // 17: brick
  Post, // 18: post
  Chipmunk, // 19: chipmunk
  ShrubRoot, // 20: shrub root
  Pebble, // 21: pebble
  SnakeGenerator, // 22: snake generator
  PoolCoping, // 23: pool coping
  PoolLeaf, // 24: pool leaf
  NilAdd, // 25: ??????
  SquishBerry, // 26: squish berry
  DogHouse, // 27: dog house
  Windmill, // 28: windmill
  Rose, // 29: rose
  TulipPot, // 30: tulip pot
  BeachBall, // 31: beach ball
  ChlorineFloat, // 32: chlorine float
  PoolRingFloat, // 33: pool ring float
  DrainPipe, // 34: drain pipe
  POW, // 35: powerup
  Firecracker, // 36: firecracker
  GlassBottle, // 37: glass bottle
  Enemy_Flea, // 38: flea enemy
  Enemy_Tick, // 39: tick enemy
  SlotCar, // 40: slot car
  LetterBlock, // 41: letter block
  MouseTrap, // 42: mouse trap
  Enemy_ToySoldier, // 43: toy solider
  FinishLine, // 44: finish line
  Enemy_Otto, // 45: otto enemy
  Puzzle, // 46: puzzle
  LegoWall, // 47: lego wall
  FlashLight, // 48: flashlight
  DCell, // 49: d-cell
  Crayon, // 50: crayon
  AntHill, // 51: ant hill
  Enemy_Dragonfly, // 52: dragonfly
  Cloud, // 53: cloud
  Enemy_Frog, // 54: frog
  CardboardBox, // 55: box
  Trampoline, // 56: trampoline
  MothBall, // 57: moth ball
  Vaccum, // 58: vacuume
  ClosetWall, // 59: pci card
  Enemy_Moth, // 60: moth
  Enemy_ComputerBug, // 61: computer bug
  SiliconPart, // 62: silicon part
  NilAdd2,
  BookStack, // 64: book stack
  Enemy_Roach, // 65: roach enemy
  ShoeBox, // 66: shoe box
  PictureFrame, // 67: picture frame
  Enemy_Ant, // 68: ant enemy
  Enemy_PondFish, // 69: fish enemy
  LilyPad, // 70: lily pad
  CatTail, // 71: cat tail
  Bubbler, // 72: bubbler
  PlatformFlower, // 73: platform flower
  FishingLure, // 74: fishing lure
  Silverware, // 75: silvereware
  PicnicBasket, // 76: picnic basket
  Kindling, // 77: kindling
  BeeHive, // 78: bee hive
  SodaCan, // 79: soda can
  Veggie, // 80: veggies
  Jar, // 81: jar
  TinCan, // 82: tin can
  Detergent, // 83: detergent
  BoxWall, // 84: box wall
  GliderPart, // 85: glider part
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "Start Coords",
  [ItemType.Snail]: "Snail",
  [ItemType.SprinklerHead]: "Sprinkler Head",
  [ItemType.Butterfly]: "Butterfly",
  [ItemType.Enemy_Gnome]: "Gnome",
  [ItemType.Daisy]: "Daisy",
  [ItemType.Grass]: "Grass",
  [ItemType.SnailShell]: "Snail Shell",
  [ItemType.Tulip]: "Tulip",
  [ItemType.Acorn]: "Acorn",
  [ItemType.Enemy_HouseFly]: "House Fly",
  [ItemType.Scarecrow]: "Scarecrow",
  [ItemType.Enemy_EvilPlant]: "Evil Plant",
  [ItemType.Door]: "Lawn Door",
  [ItemType.RideBall]: "Ride Ball",
  [ItemType.BowlingMarble]: "Bowling Marble",
  [ItemType.BowlingPins]: "Bowling Pins",
  [ItemType.Brick]: "Brick",
  [ItemType.Post]: "Post",
  [ItemType.Chipmunk]: "Chipmunk",
  [ItemType.ShrubRoot]: "Shrub Root",
  [ItemType.Pebble]: "Pebble",
  [ItemType.SnakeGenerator]: "Snake Generator",
  [ItemType.PoolCoping]: "Pool Coping",
  [ItemType.PoolLeaf]: "Pool Leaf",
  [ItemType.NilAdd]: "Nil Add",
  [ItemType.SquishBerry]: "Squish Berry",
  [ItemType.DogHouse]: "Dog House",
  [ItemType.Windmill]: "Windmill",
  [ItemType.Rose]: "Rose",
  [ItemType.TulipPot]: "Tulip Pot",
  [ItemType.BeachBall]: "Beach Ball",
  [ItemType.ChlorineFloat]: "Chlorine Float",
  [ItemType.PoolRingFloat]: "Pool Ring Float",
  [ItemType.DrainPipe]: "Drain Pipe",
  [ItemType.POW]: "Powerup",
  [ItemType.Firecracker]: "Firecracker",
  [ItemType.GlassBottle]: "Glass Bottle",
  [ItemType.Enemy_Flea]: "Flea Enemy",
  [ItemType.Enemy_Tick]: "Tick Enemy",
  [ItemType.SlotCar]: "Slot Car",
  [ItemType.LetterBlock]: "Letter Block",
  [ItemType.MouseTrap]: "Mouse Trap",
  [ItemType.Enemy_ToySoldier]: "Toy Soldier",
  [ItemType.FinishLine]: "Finish Line",
  [ItemType.Enemy_Otto]: "Otto Enemy",
  [ItemType.Puzzle]: "Puzzle",
  [ItemType.LegoWall]: "Lego Wall",
  [ItemType.FlashLight]: "Flashlight",
  [ItemType.DCell]: "D-cell",
  [ItemType.Crayon]: "Crayon",
  [ItemType.AntHill]: "Ant Hill",
  [ItemType.Enemy_Dragonfly]: "Dragonfly Enemy",
  [ItemType.Cloud]: "Cloud",
  [ItemType.Enemy_Frog]: "Frog Enemy",
  [ItemType.CardboardBox]: "Cardboard Box",
  [ItemType.Trampoline]: "Trampoline",
  [ItemType.MothBall]: "Moth Ball",
  [ItemType.Vaccum]: "Vacuum",
  [ItemType.ClosetWall]: "PCI Card",
  [ItemType.Enemy_Moth]: "Moth Enemy",
  [ItemType.Enemy_ComputerBug]: "Computer Bug Enemy",
  [ItemType.SiliconPart]: "Silicon Part",
  [ItemType.NilAdd2]: "Nil Add 2",
  [ItemType.BookStack]: "Book Stack",
  [ItemType.Enemy_Roach]: "Roach Enemy",
  [ItemType.ShoeBox]: "Shoe Box",
  [ItemType.PictureFrame]: "Picture Frame",
  [ItemType.Enemy_Ant]: "Ant Enemy",
  [ItemType.Enemy_PondFish]: "Pond Fish Enemy",
  [ItemType.LilyPad]: "Lily Pad",
  [ItemType.CatTail]: "Cat Tail",
  [ItemType.Bubbler]: "Bubbler",
  [ItemType.PlatformFlower]: "Platform Flower",
  [ItemType.FishingLure]: "Fishing Lure",
  [ItemType.Silverware]: "Silverware",
  [ItemType.PicnicBasket]: "Picnic Basket",
  [ItemType.Kindling]: "Kindling",
  [ItemType.BeeHive]: "Bee Hive",
  [ItemType.SodaCan]: "Soda Can",
  [ItemType.Veggie]: "Veggie",
  [ItemType.Jar]: "Jar",
  [ItemType.TinCan]: "Tin Can",
  [ItemType.Detergent]: "Detergent",
  [ItemType.BoxWall]: "Box Wall",
  [ItemType.GliderPart]: "Glider Part",
};
