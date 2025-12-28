export enum ItemType {
  Caveman, // 0: Caveman enemy
  AppearZone, // 1: Appear zone (trigger)
  Store, // 2: Store
  Bunny, // 3: Bunny
  Triceratops, // 4: Triceratops enemy
  Turtle, // 5: Turtle enemy
  ManEatingPlant, // 6: Man-eating plant enemy
  DinoEgg, // 7: Dino egg
  BabyDino, // 8: Baby dino enemy
  Rex, // 9: T-Rex enemy
  ClownBalloon, // 10: Clown balloon (unused)
  ClownCar, // 11: Clown car enemy
  JackInTheBox, // 12: Jack-in-the-box enemy
  Clown, // 13: Clown enemy
  MagicHat, // 14: Magic hat
  HealthPowerup, // 15: Health powerup
  FlowerClown, // 16: Flower clown enemy
  Teleport, // 17: Teleporter
  RaceCar, // 18: Race car
  Key, // 19: Key
  ClownDoor, // 20: Clown door
  CandyMovingPlatform, // 21: Candy moving platform
  CandyDoor, // 22: Candy door
  Star, // 23: Star
  ChocolateBunny, // 24: Chocolate bunny enemy
  GingerbreadMan, // 25: Gingerbread man enemy
  MintCandy, // 26: Mint candy enemy
  CherryBomb, // 27: Cherry bomb (was here, now unused)
  GumBear, // 28: Gum bear enemy
  PlayerStartCoords, // 29: Player start coordinates
  FinishLine, // 30: Finish line
  JurassicDoor, // 31: Jurassic door
  Caramel, // 32: Caramel enemy
  WeaponPowerup, // 33: Weapon powerup
  MiscPowerup, // 34: Misc powerup
  GumBall, // 35: Gum ball
  LemonDrop, // 36: Lemon drop enemy
  Giant, // 37: Giant enemy
  Dragon, // 38: Dragon enemy
  Witch, // 39: Witch enemy
  BigBadWolf, // 40: Big bad wolf enemy
  Soldier, // 41: Soldier enemy
  Muffin, // 42: Muffin
  Spider, // 43: Spider enemy
  FairyDoor, // 44: Fairy door
  Battery, // 45: Battery enemy
  PoisonApple, // 46: Poison apple enemy
  Slinky, // 47: Slinky enemy
  EightBall, // 48: 8-ball enemy
  ShipPowerup, // 49: Ship powerup
  Robot, // 50: Robot enemy
  Doggy, // 51: Doggy
  BargainDoor, // 52: Bargain door
  Top, // 53: Top enemy
  Hydrant, // 54: Hydrant
  KeyColor, // 55: Key color (color key)
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.Caveman]: "Caveman",
  [ItemType.AppearZone]: "Appear Zone",
  [ItemType.Store]: "Store",
  [ItemType.Bunny]: "Bunny",
  [ItemType.Triceratops]: "Triceratops",
  [ItemType.Turtle]: "Turtle",
  [ItemType.ManEatingPlant]: "Man-Eating Plant",
  [ItemType.DinoEgg]: "Dino Egg",
  [ItemType.BabyDino]: "Baby Dino",
  [ItemType.Rex]: "T-Rex",
  [ItemType.ClownBalloon]: "Clown Balloon",
  [ItemType.ClownCar]: "Clown Car",
  [ItemType.JackInTheBox]: "Jack-in-the-Box",
  [ItemType.Clown]: "Clown",
  [ItemType.MagicHat]: "Magic Hat",
  [ItemType.HealthPowerup]: "Health Powerup",
  [ItemType.FlowerClown]: "Flower Clown",
  [ItemType.Teleport]: "Teleporter",
  [ItemType.RaceCar]: "Race Car",
  [ItemType.Key]: "Key",
  [ItemType.ClownDoor]: "Clown Door",
  [ItemType.CandyMovingPlatform]: "Candy Moving Platform",
  [ItemType.CandyDoor]: "Candy Door",
  [ItemType.Star]: "Star",
  [ItemType.ChocolateBunny]: "Chocolate Bunny",
  [ItemType.GingerbreadMan]: "Gingerbread Man",
  [ItemType.MintCandy]: "Mint Candy",
  [ItemType.CherryBomb]: "Cherry Bomb",
  [ItemType.GumBear]: "Gum Bear",
  [ItemType.PlayerStartCoords]: "Player Start Coords",
  [ItemType.FinishLine]: "Finish Line",
  [ItemType.JurassicDoor]: "Jurassic Door",
  [ItemType.Caramel]: "Caramel",
  [ItemType.WeaponPowerup]: "Weapon Powerup",
  [ItemType.MiscPowerup]: "Misc Powerup",
  [ItemType.GumBall]: "Gum Ball",
  [ItemType.LemonDrop]: "Lemon Drop",
  [ItemType.Giant]: "Giant",
  [ItemType.Dragon]: "Dragon",
  [ItemType.Witch]: "Witch",
  [ItemType.BigBadWolf]: "Big Bad Wolf",
  [ItemType.Soldier]: "Soldier",
  [ItemType.Muffin]: "Muffin",
  [ItemType.Spider]: "Spider",
  [ItemType.FairyDoor]: "Fairy Door",
  [ItemType.Battery]: "Battery",
  [ItemType.PoisonApple]: "Poison Apple",
  [ItemType.Slinky]: "Slinky",
  [ItemType.EightBall]: "8-Ball",
  [ItemType.ShipPowerup]: "Ship Powerup",
  [ItemType.Robot]: "Robot",
  [ItemType.Doggy]: "Doggy",
  [ItemType.BargainDoor]: "Bargain Door",
  [ItemType.Top]: "Top",
  [ItemType.Hydrant]: "Hydrant",
  [ItemType.KeyColor]: "Key Color",
};
