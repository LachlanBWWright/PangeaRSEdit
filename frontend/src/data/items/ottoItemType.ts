export enum ItemType {
  StartCoords, // My Start Coords
  BasicPlant, // 1:  basic plant/tree
  SpacePodGenerator, // 2:  space pod
  Enemy_Squooshy, // 3: squooshy enemy
  Human, // 4: Human
  Atom,
  PowerupPod,
  Enemy_BrainAlien, // 7:  brain alien
  Enemy_Onion, // 8:  Onion
  Enemy_Corn, // 9:  Corn
  Enemy_Tomato, // 10:  tomato
  Barn, // 11:  barn
  Silo, // 12:  solo
  WoodenGate, // 13:  wooden gate
  PhonePole, // 14:  phone pole
  Tractor, // 15:  farm tractor
  Sprout, // 16:   sprout
  CornStalk, // 17:  corn stalk
  BigLeafPlant, // 18:  big leaf plant
  MetalGate, // 19:  metal gate
  FencePost, // 20:  fence post
  Windmill, // 21:  windmill
  MetalTub, // 22:  metal tub
  OutHouse, // 23:  outhouse
  Rock, // 24:  rock
  Hay, // 25:  hay bale
  ExitRocket, // 26:  exit rocket
  Checkpoint, // 27:  checkpoint
  SlimePipe, // 28:  slime pipe
  FallingCrystal, // 29:	falling crystal
  Enemy_Blob, // 30:  blob enemy
  BumperBubble, // 31:  bumper bubble
  BasicCrystal, // 32:  basic crystal
  InertBubble, // 33:  soap bubble
  SlimeTree, // 34:  slime tree
  MagnetMonster, // 35:  magnet monster (spline only)
  FallingSlimePlatform, // 36:  falling slime platform
  BubblePump, // 37:  bubble pump
  SlimeMech, // 38:  slime mech
  SpinningPlatform, // 39:  spinning platform
  MovingPlatform, // 40:  moving platform (spline only)
  MachineBoss, // 41:  blob boss machine
  BlobBossTube, // 42: 	blob boss tube
  ScaffoldingPost, // 43:  scaffolding post
  JungleGate, // 44:  jungle gate
  CrunchDoor, // 45:  crunch door
  Manhole, // 46:  manhole
  CloudPlatform, // 47:  cloud platform
  CloudTunnel, // 48:  cloud tunnel
  Enemy_Flamester, // 49:  flamester
  Enemy_GiantLizard, // 50:  giant lizard
  Enemy_FlyTrap, // 51:  venus flytrap
  Enemy_Mantis, // 52:  mantis
  TurtlePlatform, // 53:  turtle platform
  Smashable, // 54:  jungle smashable
  LeafPlatform, // 55:  leaf platform
  HelpBeacon, // 56:  help beacon
  Teleporter, // 57:  teleporter
  ZipLinePost, // 58:  zip line post
  Enemy_Mutant, // 59:  mutant enemy
  Enemy_MutantRobot, // 60:  mutant robot enemy
  HumanScientist, // 61:  scientist human
  ProximityMine, // 62:  proximity mine
  LampPost, // 63:  lamp posts
  DebrisGate, // 64:  debris gate
  GraveStone, // 65:  grave stone
  CrashedShip, // 66:  crashed ship
  ChainReactingMine, // 67:  chain reacting mine
  Rubble, // 68:  rubble
  TeleporterMap, // 69:  teleporter map (UNUSED)
  GreenSteam, // 70:  green steam
  TentacleGenerator, // 71:  tentacle generator
  PitcherPlantBoss, // 72:  pitcher plant boss
  PitcherPod, // 73:  pitcher pod
  TractorBeamPost, // 74:  tractor beam post
  Cannon, // 75:  cannon
  BumperCar, // 76:  bumper car
  TireBumperStrip, // 77:	tire bumper
  Enemy_Clown, // 78:	clown enemy
  Clownfish, // 79: clown fish
  BumperCarPowerPost, // 80: bumper car power post
  Enemy_StrongMan, // 81:	strongman enemy
  BumperCarGate, // 82:  bumper car gate
  RocketSled, // 83: tobogan
  TrapDoor, // 84:  trap door
  ZigZagSlats, // 85:  zig-zag slats
  Unknown, // 86: ?????
  LavaPillar, // 87:  lava pillar
  VolcanoGeneratorZone, // 88:  volcano generator
  JawsBot, // 89:  jaws bot enemy
  IceSaucer, // 90:  ice saucer
  RunwayLights, // 91:  runway lights
  Enemy_IceCube, // 92:  ice cube enemy
  HammerBot, // 93:  HAMMER BOT
  DrillBot, // 94:  drill bot
  SwingerBot, // 95:  swinger bot
  LavaStone, // 96:  lava stone
  Snowball, // 97: 	snowball
  LavaPlatform, // 98:  lava platform
  Smoker, // 99:  smoker
  RadarDish, // 100:  tower / radar dish
  PeopleHut, // 101: people hut
  Beemer, // 102:  bemmer
  Railgun, // 103:  rail gun
  Turret, // 104:  turret
  Enemy_BrainBoss, // 105:  brain boss
  BlobArrow, // 106:  blob arrow
  NeuronStrand, // 107:  neuron strand
  BrainPort, // 108:  brain port */
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.BasicPlant]: "Basic Plant",
  [ItemType.SpacePodGenerator]: "Space Pod Generator",
  [ItemType.Enemy_Squooshy]: "Squooshy Enemy",
  [ItemType.Human]: "Human",
  [ItemType.Atom]: "Atom",
  [ItemType.PowerupPod]: "Powerup Pod",
  [ItemType.Enemy_BrainAlien]: "Brain Alien Enemy",
  [ItemType.Enemy_Onion]: "Onion Enemy",
  [ItemType.Enemy_Corn]: "Corn Enemy",
  [ItemType.Enemy_Tomato]: "Tomato Enemy",
  [ItemType.Barn]: "Barn",
  [ItemType.Silo]: "Silo",
  [ItemType.WoodenGate]: "Wooden Gate",
  [ItemType.PhonePole]: "Phone Pole",
  [ItemType.Tractor]: "Farm Tractor",
  [ItemType.Sprout]: "Sprout",
  [ItemType.CornStalk]: "Corn Stalk",
  [ItemType.BigLeafPlant]: "Big Leaf Plant",
  [ItemType.MetalGate]: "Metal Gate",
  [ItemType.FencePost]: "Fence Post",
  [ItemType.Windmill]: "Windmill",
  [ItemType.MetalTub]: "Metal Tub",
  [ItemType.OutHouse]: "Outhouse",
  [ItemType.Rock]: "Rock",
  [ItemType.Hay]: "Hay Bale",
  [ItemType.ExitRocket]: "Exit Rocket",
  [ItemType.Checkpoint]: "Checkpoint",
  [ItemType.SlimePipe]: "Slime Pipe",
  [ItemType.FallingCrystal]: "Falling Crystal",
  [ItemType.MachineBoss]: "Machine Boss",
  [ItemType.BlobBossTube]: "Blob Boss Tube",
  [ItemType.ScaffoldingPost]: "Scaffolding Post",
  [ItemType.JungleGate]: "Jungle Gate",
  [ItemType.CrunchDoor]: "Crunch Door",
  [ItemType.Manhole]: "Manhole",
  [ItemType.CloudPlatform]: "Cloud Platform",
  [ItemType.CloudTunnel]: "Cloud Tunnel",
  [ItemType.Enemy_Flamester]: "Flamester",
  [ItemType.Enemy_GiantLizard]: "Giant Lizard",
  [ItemType.Enemy_FlyTrap]: "Fly Trap",
  [ItemType.Enemy_Mantis]: "Mantis",
  [ItemType.TurtlePlatform]: "Turtle Platform",
  [ItemType.Smashable]: "Smashable",
  [ItemType.LeafPlatform]: "Leaf Platform",
  [ItemType.HelpBeacon]: "Help Beacon",
  [ItemType.Teleporter]: "Teleporter",
  [ItemType.ZipLinePost]: "Zip Line Post",
  [ItemType.Enemy_Mutant]: "Mutant Enemy",
  [ItemType.Enemy_Blob]: "Blob Enemy",
  [ItemType.BumperBubble]: "Bumper Bubble",
  [ItemType.BasicCrystal]: "Basic Crystal",
  [ItemType.InertBubble]: "Soap Bubble",
  [ItemType.SlimeTree]: "Slime Tree",
  [ItemType.MagnetMonster]: "Magnet Monster",
  [ItemType.FallingSlimePlatform]: "Falling Slime Platform",
  [ItemType.BubblePump]: "Bubble Pump",
  [ItemType.SlimeMech]: "Slime Mech",
  [ItemType.SpinningPlatform]: "Spinning Platform",
  [ItemType.MovingPlatform]: "Moving Platform",
  [ItemType.Enemy_MutantRobot]: "Mutant Robot Enemy",
  [ItemType.HumanScientist]: "Scientist Human",
  [ItemType.ProximityMine]: "Proximity Mine",
  [ItemType.LampPost]: "Lamp Posts",
  [ItemType.DebrisGate]: "Debris Gate",
  [ItemType.GraveStone]: "Grave Stone",
  [ItemType.CrashedShip]: "Crashed Ship",
  [ItemType.ChainReactingMine]: "Chain Reacting Mine",
  [ItemType.Rubble]: "Rubble",
  [ItemType.TeleporterMap]: "Teleporter Map",
  [ItemType.GreenSteam]: "Green Steam",
  [ItemType.TentacleGenerator]: "Tentacle Generator",
  [ItemType.PitcherPlantBoss]: "Pitcher Plant Boss",
  [ItemType.PitcherPod]: "Pitcher Pod",
  [ItemType.TractorBeamPost]: "Shepherd Beam Post",
  [ItemType.Cannon]: "Cannon",
  [ItemType.BumperCar]: "Bumper Car",
  [ItemType.TireBumperStrip]: "Tire Bumper",
  [ItemType.Enemy_Clown]: "Clown Enemy",
  [ItemType.Clownfish]: "Clown Fish",
  [ItemType.BumperCarPowerPost]: "Bumper Car Power Post",
  [ItemType.Enemy_StrongMan]: "Strongman Enemy",
  [ItemType.BumperCarGate]: "Bumper Car Gate",
  [ItemType.RocketSled]: "Tobogan",
  [ItemType.TrapDoor]: "Trap Door",
  [ItemType.ZigZagSlats]: "Zig-Zag Slats",
  [ItemType.Unknown]: "Unknown",
  [ItemType.LavaPillar]: "Lava Pillar",
  [ItemType.VolcanoGeneratorZone]: "Volcano Generator",
  [ItemType.JawsBot]: "Jaws Bot",
  [ItemType.IceSaucer]: "Ice Saucer",
  [ItemType.RunwayLights]: "Runway Lights",
  [ItemType.Enemy_IceCube]: "Ice Cube",
  [ItemType.HammerBot]: "Hammer Bot",
  [ItemType.DrillBot]: "Drill Bot",
  [ItemType.SwingerBot]: "Swinger Bot",
  [ItemType.LavaStone]: "Lava Stone",
  [ItemType.Snowball]: "Snowball",
  [ItemType.LavaPlatform]: "Lava Platform",
  [ItemType.Smoker]: "Smoker",
  [ItemType.RadarDish]: "Tower / Radar Dish",
  [ItemType.PeopleHut]: "People Hut",
  [ItemType.Beemer]: "Beemer",
  [ItemType.Railgun]: "Rail Gun",
  [ItemType.Turret]: "Turret",
  [ItemType.Enemy_BrainBoss]: "Brain Boss",
  [ItemType.BlobArrow]: "Blob Arrow",
  [ItemType.NeuronStrand]: "Neuron Strand",
  [ItemType.BrainPort]: "Brain Port",
};

export type OttoItemParams = {
  flags: string;
  p0: string;
  p1: string;
  p2: string;
  p3: string;
};

const ottoDefaultParams: OttoItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const ottoItemTypeParams: Record<ItemType, OttoItemParams> = {
  [ItemType.StartCoords]: ottoDefaultParams, // "My Start Coords",
  [ItemType.BasicPlant]: ottoDefaultParams, // "Basic Plant",
  [ItemType.SpacePodGenerator]: ottoDefaultParams, // "Space Pod Generator",
  [ItemType.Enemy_Squooshy]: ottoDefaultParams, // "Squooshy Enemy",
  [ItemType.Human]: ottoDefaultParams, // "Human",
  [ItemType.Atom]: ottoDefaultParams, // "Atom",
  [ItemType.PowerupPod]: ottoDefaultParams, // "Powerup Pod",
  [ItemType.Enemy_BrainAlien]: ottoDefaultParams, // "Brain Alien Enemy",
  [ItemType.Enemy_Onion]: ottoDefaultParams, // "Onion Enemy",
  [ItemType.Enemy_Corn]: ottoDefaultParams, // "Corn Enemy",
  [ItemType.Enemy_Tomato]: ottoDefaultParams, // "Tomato Enemy",
  [ItemType.Barn]: ottoDefaultParams, // "Barn",
  [ItemType.Silo]: ottoDefaultParams, // "Silo",
  [ItemType.WoodenGate]: ottoDefaultParams, // "Wooden Gate",
  [ItemType.PhonePole]: ottoDefaultParams, // "Phone Pole",
  [ItemType.Tractor]: ottoDefaultParams, // "Farm Tractor",
  [ItemType.Sprout]: ottoDefaultParams, // "Sprout",
  [ItemType.CornStalk]: ottoDefaultParams, // "Corn Stalk",
  [ItemType.BigLeafPlant]: ottoDefaultParams, // "Big Leaf Plant",
  [ItemType.MetalGate]: ottoDefaultParams, // "Metal Gate",
  [ItemType.FencePost]: ottoDefaultParams, // "Fence Post",
  [ItemType.Windmill]: ottoDefaultParams, // "Windmill",
  [ItemType.MetalTub]: ottoDefaultParams, // "Metal Tub",
  [ItemType.OutHouse]: ottoDefaultParams, // "Outhouse",
  [ItemType.Rock]: ottoDefaultParams, // "Rock",
  [ItemType.Hay]: ottoDefaultParams, // "Hay Bale",
  [ItemType.ExitRocket]: ottoDefaultParams, // "Exit Rocket",
  [ItemType.Checkpoint]: ottoDefaultParams, // "Checkpoint",
  [ItemType.SlimePipe]: ottoDefaultParams, // "Slime Pipe",
  [ItemType.FallingCrystal]: ottoDefaultParams, // "Falling Crystal",
  [ItemType.MachineBoss]: ottoDefaultParams, // "Machine Boss",
  [ItemType.BlobBossTube]: ottoDefaultParams, // "Blob Boss Tube",
  [ItemType.ScaffoldingPost]: ottoDefaultParams, // "Scaffolding Post",
  [ItemType.JungleGate]: ottoDefaultParams, // "Jungle Gate",
  [ItemType.CrunchDoor]: ottoDefaultParams, // "Crunch Door",
  [ItemType.Manhole]: ottoDefaultParams, // "Manhole",
  [ItemType.CloudPlatform]: ottoDefaultParams, // "Cloud Platform",
  [ItemType.CloudTunnel]: ottoDefaultParams, // "Cloud Tunnel",
  [ItemType.Enemy_Flamester]: ottoDefaultParams, // "Flamester",
  [ItemType.Enemy_GiantLizard]: ottoDefaultParams, // "Giant Lizard",
  [ItemType.Enemy_FlyTrap]: ottoDefaultParams, // "Fly Trap",
  [ItemType.Enemy_Mantis]: ottoDefaultParams, // "Mantis",
  [ItemType.TurtlePlatform]: ottoDefaultParams, // "Turtle Platform",
  [ItemType.Smashable]: ottoDefaultParams, // "Smashable",
  [ItemType.LeafPlatform]: ottoDefaultParams, // "Leaf Platform",
  [ItemType.HelpBeacon]: ottoDefaultParams, // "Help Beacon",
  [ItemType.Teleporter]: ottoDefaultParams, // "Teleporter",
  [ItemType.ZipLinePost]: ottoDefaultParams, // "Zip Line Post",
  [ItemType.Enemy_Mutant]: ottoDefaultParams, // "Mutant Enemy",
  [ItemType.Enemy_Blob]: ottoDefaultParams, // "Blob Enemy",
  [ItemType.BumperBubble]: ottoDefaultParams, // "Bumper Bubble",
  [ItemType.BasicCrystal]: ottoDefaultParams, // "Basic Crystal",
  [ItemType.InertBubble]: ottoDefaultParams, // "Soap Bubble",
  [ItemType.SlimeTree]: ottoDefaultParams, // "Slime Tree",
  [ItemType.MagnetMonster]: ottoDefaultParams, // "Magnet Monster",
  [ItemType.FallingSlimePlatform]: ottoDefaultParams, // "Falling Slime Platform",
  [ItemType.BubblePump]: ottoDefaultParams, // "Bubble Pump",
  [ItemType.SlimeMech]: ottoDefaultParams, // "Slime Mech",
  [ItemType.SpinningPlatform]: ottoDefaultParams, // "Spinning Platform",
  [ItemType.MovingPlatform]: ottoDefaultParams, // "Moving Platform",
  [ItemType.Enemy_MutantRobot]: ottoDefaultParams, // "Mutant Robot Enemy",
  [ItemType.HumanScientist]: ottoDefaultParams, // "Scientist Human",
  [ItemType.ProximityMine]: ottoDefaultParams, // "Proximity Mine",
  [ItemType.LampPost]: ottoDefaultParams, // "Lamp Posts",
  [ItemType.DebrisGate]: ottoDefaultParams, // "Debris Gate",
  [ItemType.GraveStone]: ottoDefaultParams, // "Grave Stone",
  [ItemType.CrashedShip]: ottoDefaultParams, // "Crashed Ship",
  [ItemType.ChainReactingMine]: ottoDefaultParams, // "Chain Reacting Mine",
  [ItemType.Rubble]: ottoDefaultParams, // "Rubble",
  [ItemType.TeleporterMap]: ottoDefaultParams, // "Teleporter Map",
  [ItemType.GreenSteam]: ottoDefaultParams, // "Green Steam",
  [ItemType.TentacleGenerator]: ottoDefaultParams, // "Tentacle Generator",
  [ItemType.PitcherPlantBoss]: ottoDefaultParams, // "Pitcher Plant Boss",
  [ItemType.PitcherPod]: ottoDefaultParams, // "Pitcher Pod",
  [ItemType.TractorBeamPost]: ottoDefaultParams, // "Shepherd Beam Post",
  [ItemType.Cannon]: ottoDefaultParams, // "Cannon",
  [ItemType.BumperCar]: ottoDefaultParams, // "Bumper Car",
  [ItemType.TireBumperStrip]: ottoDefaultParams, // "Tire Bumper",
  [ItemType.Enemy_Clown]: ottoDefaultParams, // "Clown Enemy",
  [ItemType.Clownfish]: ottoDefaultParams, // "Clown Fish",
  [ItemType.BumperCarPowerPost]: ottoDefaultParams, // "Bumper Car Power Post",
  [ItemType.Enemy_StrongMan]: ottoDefaultParams, // "Strongman Enemy",
  [ItemType.BumperCarGate]: ottoDefaultParams, // "Bumper Car Gate",
  [ItemType.RocketSled]: ottoDefaultParams, // "Tobogan",
  [ItemType.TrapDoor]: ottoDefaultParams, // "Trap Door",
  [ItemType.ZigZagSlats]: ottoDefaultParams, // "Zig-Zag Slats",
  [ItemType.Unknown]: ottoDefaultParams,
  [ItemType.LavaPillar]: ottoDefaultParams, // "Lava Pillar",
  [ItemType.VolcanoGeneratorZone]: ottoDefaultParams, // "Volcano Generator",
  [ItemType.JawsBot]: ottoDefaultParams, // "Jaws Bot",
  [ItemType.IceSaucer]: ottoDefaultParams, // "Ice Saucer",
  [ItemType.RunwayLights]: ottoDefaultParams, // "Runway Lights",
  [ItemType.Enemy_IceCube]: ottoDefaultParams, // "Ice Cube",
  [ItemType.HammerBot]: ottoDefaultParams, // "Hammer Bot",
  [ItemType.DrillBot]: ottoDefaultParams, // "Drill Bot",
  [ItemType.SwingerBot]: ottoDefaultParams, // "Swinger Bot",
  [ItemType.LavaStone]: ottoDefaultParams, // "Lava Stone",
  [ItemType.Snowball]: ottoDefaultParams, // "Snowball",
  [ItemType.LavaPlatform]: ottoDefaultParams, // "Lava Platform",
  [ItemType.Smoker]: ottoDefaultParams, // "Smoker",
  [ItemType.RadarDish]: ottoDefaultParams, // "Tower / Radar Dish",
  [ItemType.PeopleHut]: ottoDefaultParams, // "People Hut",
  [ItemType.Beemer]: ottoDefaultParams, // "Beemer",
  [ItemType.Railgun]: ottoDefaultParams, // "Rail Gun",
  [ItemType.Turret]: ottoDefaultParams, // "Turret",
  [ItemType.Enemy_BrainBoss]: ottoDefaultParams, // "Brain Boss",
  [ItemType.BlobArrow]: ottoDefaultParams, // "Blob Arrow",
  [ItemType.NeuronStrand]: ottoDefaultParams, // "Neuron Strand",
  [ItemType.BrainPort]: ottoDefaultParams, // "Brain Port",
};

//Level restriction - Return 0 if available across levels, -1 if item isn't available (wasn't implemented in game)
export function getLevelRestriction(itemType: ItemType): number {
  switch (itemType) {
    case ItemType.StartCoords:
      return 0;
    case ItemType.BasicPlant:
      return 1;
    case ItemType.SpacePodGenerator:
      return 4;
    case ItemType.Enemy_Squooshy:
      return 8;
    case ItemType.Human:
      return 0;
    case ItemType.Atom:
      return 0;
    case ItemType.PowerupPod:
      return 0;
    case ItemType.Enemy_BrainAlien:
      return 0;
    case ItemType.Enemy_Onion:
      return 1;
    case ItemType.Enemy_Corn:
      return 1;
    case ItemType.Enemy_Tomato:
      return 1;
    case ItemType.Barn:
      return 1;
    case ItemType.Silo:
      return 1;
    case ItemType.WoodenGate:
      return 1;
    case ItemType.PhonePole:
      return 1;
    case ItemType.Tractor:
      return 1;
    case ItemType.Sprout:
      return 1;
    case ItemType.CornStalk:
      return 1;
    case ItemType.BigLeafPlant:
      return 1;
    case ItemType.MetalGate:
      return 1;
    case ItemType.FencePost:
      return 1;
    case ItemType.Windmill:
      return 1;
    case ItemType.MetalTub:
      return 1;
    case ItemType.OutHouse:
      return 1;
    case ItemType.Rock:
      return 1;
    case ItemType.Hay:
      return 1;
    case ItemType.ExitRocket:
      return 0;
    case ItemType.Checkpoint:
      return 0;
    case ItemType.SlimePipe:
      return 2;
    case ItemType.FallingCrystal:
      return 2;
    case ItemType.MachineBoss:
      return 2;
    case ItemType.BlobBossTube:
      return 2;
    case ItemType.ScaffoldingPost:
      return 5;
    case ItemType.JungleGate:
      return 6;
    case ItemType.CrunchDoor:
      return 0;
    case ItemType.Manhole:
      return 4;
    case ItemType.CloudPlatform:
      return 5;
    case ItemType.CloudTunnel:
      return 5;
    case ItemType.Enemy_Flamester:
      return 0; //8??
    case ItemType.Enemy_GiantLizard:
      return 6;
    case ItemType.Enemy_FlyTrap:
      return 6;
    case ItemType.Enemy_Mantis:
      return 6;
    case ItemType.TurtlePlatform:
      return 6;
    case ItemType.Smashable:
      return 0; //6???
    case ItemType.LeafPlatform:
      return 6;
    case ItemType.HelpBeacon:
      return 0;
    case ItemType.Teleporter:
      return 0;
    case ItemType.ZipLinePost:
      return 0; /// 0??? ziplines in 4 and 8
    case ItemType.Enemy_Mutant:
      return 4;
    case ItemType.Enemy_Blob:
      return 2;
    case ItemType.BumperBubble:
      return 5;
    case ItemType.BasicCrystal:
      return 0; //2??
    case ItemType.InertBubble:
      return 0;
    case ItemType.SlimeTree:
      return 0;
    case ItemType.MagnetMonster:
      return 2;
    case ItemType.FallingSlimePlatform:
      return 0;
    case ItemType.BubblePump:
      return 0;
    case ItemType.SlimeMech:
      return 0;
    case ItemType.SpinningPlatform:
      return 0; //3?
    case ItemType.MovingPlatform:
      return 0; //3?
    case ItemType.Enemy_MutantRobot:
      return 4;
    case ItemType.HumanScientist:
      return 0;
    case ItemType.ProximityMine:
      return 4;
    case ItemType.LampPost:
      return 4;
    case ItemType.DebrisGate:
      return 4;
    case ItemType.GraveStone:
      return 4;
    case ItemType.CrashedShip:
      return 4;
    case ItemType.ChainReactingMine:
      return 4;
    case ItemType.Rubble:
      return 4;
    case ItemType.TeleporterMap:
      return 4;
    case ItemType.GreenSteam:
      return 4;
    case ItemType.TentacleGenerator:
      return 0;
    case ItemType.PitcherPlantBoss:
      return 0;
    case ItemType.PitcherPod:
      return 0;
    case ItemType.TractorBeamPost:
      return 0;
    case ItemType.Cannon:
      return 5;
    case ItemType.BumperCar:
      return 5;
    case ItemType.TireBumperStrip:
      return 5;
    case ItemType.Enemy_Clown:
      return 5;
    case ItemType.Clownfish:
      return 5;
    case ItemType.BumperCarPowerPost:
      return 5;
    case ItemType.Enemy_StrongMan:
      return 5;
    case ItemType.BumperCarGate:
      return 5;
    case ItemType.RocketSled:
      return 5;
    case ItemType.TrapDoor:
      return 5;
    case ItemType.ZigZagSlats:
      return 5;
    case ItemType.Unknown:
      return -1;
    case ItemType.LavaPillar:
      return 8;
    case ItemType.VolcanoGeneratorZone:
      return 8;
    case ItemType.JawsBot:
      return 8;
    case ItemType.IceSaucer:
      return 8;
    case ItemType.RunwayLights:
      return 0; //???
    case ItemType.Enemy_IceCube:
      return 8;
    case ItemType.HammerBot:
      return 8;
    case ItemType.DrillBot:
      return 8;
    case ItemType.SwingerBot:
      return 8;
    case ItemType.LavaStone:
      return 8;
    case ItemType.Snowball:
      return 8;
    case ItemType.LavaPlatform:
      return 8;
    case ItemType.Smoker:
      return 8;
    case ItemType.RadarDish:
      return 9;
    case ItemType.PeopleHut:
      return 9;
    case ItemType.Beemer:
      return 0; //9???
    case ItemType.Railgun:
      return 9;
    case ItemType.Turret:
      return 9;
    case ItemType.Enemy_BrainBoss:
      return 10;
    case ItemType.BlobArrow:
      return 2; //???
    case ItemType.NeuronStrand:
      return 10;
    case ItemType.BrainPort:
      return 10;
  }

  return 0;
}

/* 	
Original from otto source code:

        NilAdd,								// My Start Coords
		AddBasicPlant,						// 1:  basic plant/tree
		AddSpacePodGenerator,				// 2:  space pod
		AddEnemy_Squooshy,					// 3: squooshy enemy
		AddHuman,							// 4: Human
		AddAtom,
		AddPowerupPod,
		AddEnemy_BrainAlien,				// 7:  brain alien
		AddEnemy_Onion,						// 8:  Onion
		AddEnemy_Corn,						// 9:  Corn
		AddEnemy_Tomato,					// 10:  tomato
		AddBarn,							// 11:  barn
		AddSilo,							// 12:  solo
		AddWoodenGate,						// 13:  wooden gate
		AddPhonePole,						// 14:  phone pole
		AddTractor,							// 15:  farm tractor
		AddSprout,							// 16:  add sprout
		AddCornStalk,						// 17:  corn stalk
		AddBigLeafPlant,					// 18:  big leaf plant
		AddMetalGate,						// 19:  metal gate
		AddFencePost,						// 20:  fence post
		AddWindmill,						// 21:  windmill
		AddMetalTub,						// 22:  metal tub
		AddOutHouse,						// 23:  outhouse
		AddRock,							// 24:  rock
		AddHay,								// 25:  hay bale
		AddExitRocket,						// 26:  exit rocket
		AddCheckpoint,						// 27:  checkpoint
		AddSlimePipe,						// 28:  slime pipe
		AddFallingCrystal,					// 29:	falling crystal
		AddEnemy_Blob,						// 30:  blob enemy
		AddBumperBubble,					// 31:  bumper bubble
		AddBasicCrystal,					// 32:  basic crystal
		AddInertBubble,						// 33:  soap bubble
		AddSlimeTree,						// 34:  slime tree
		NilAdd,								// 35:  magnet monster (spline only)
		AddFallingSlimePlatform,			// 36:  falling slime platform
		AddBubblePump,						// 37:  bubble pump
		AddSlimeMech,						// 38:  slime mech
		AddSpinningPlatform,				// 39:  spinning platform
		NilAdd,								// 40:  moving platform (spline only)
		NilAdd,								// 41:  blob boss machine
		AddBlobBossTube,					// 42: 	blob boss tube
		AddScaffoldingPost,					// 43:  scaffolding post
		AddJungleGate,						// 44:  jungle gate
		AddCrunchDoor,						// 45:  crunch door
		AddManhole,							// 46:  manhole
		AddCloudPlatform,					// 47:  cloud platform
		AddCloudTunnel,						// 48:  cloud tunnel
		AddEnemy_Flamester,					// 49:  flamester
		AddEnemy_GiantLizard,				// 50:  giant lizard
		AddEnemy_FlyTrap,					// 51:  venus flytrap
		AddEnemy_Mantis,					// 52:  mantis
		AddTurtlePlatform,					// 53:  turtle platform
		AddSmashable,						// 54:  jungle smashable
		AddLeafPlatform,					// 55:  leaf platform
		AddHelpBeacon,						// 56:  help beacon
		AddTeleporter,						// 57:  teleporter
		AddZipLinePost,						// 58:  zip line post
		AddEnemy_Mutant,					// 59:  mutant enemy
		AddEnemy_MutantRobot,				// 60:  mutant robot enemy
		AddHumanScientist,					// 61:  scientist human
		AddProximityMine,					// 62:  proximity mine
		AddLampPost,						// 63:  lamp posts
		AddDebrisGate,						// 64:  debris gate
		AddGraveStone,						// 65:  grave stone
		AddCrashedShip,						// 66:  crashed ship
		AddChainReactingMine,				// 67:  chain reacting mine
		AddRubble,							// 68:  rubble
		AddTeleporterMap,					// 69:  teleporter map (UNUSED)
		AddGreenSteam,						// 70:  green steam
		AddTentacleGenerator,				// 71:  tentacle generator
		AddPitcherPlantBoss,				// 72:  pitcher plant boss
		AddPitcherPod,						// 73:  pitcher pod
		AddTractorBeamPost,					// 74:  tractor beam post
		AddCannon,							// 75:  cannon
		AddBumperCar,						// 76:  bumper car
		AddTireBumperStrip,					// 77:	tire bumper
		AddEnemy_Clown,						// 78:	clown enemy
		NilAdd,								// 79: clown fish
		AddBumperCarPowerPost,				// 80: bumper car power post
		AddEnemy_StrongMan,					// 81:	strongman enemy
		AddBumperCarGate,					// 82:  bumper car gate
		AddRocketSled,						// 83: tobogan
		AddTrapDoor,						// 84:  trap door
		AddZigZagSlats,						// 85:  zig-zag slats
		NilAdd,								// 86: ?????
		AddLavaPillar,						// 87:  lava pillar
		AddVolcanoGeneratorZone,			// 88:  volcano generator
		AddJawsBot,							// 89:  jaws bot enemy
		AddIceSaucer,						// 90:  ice saucer
		AddRunwayLights,					// 91:  runway lights
		AddEnemy_IceCube,					// 92:  ice cube enemy
		AddHammerBot,						// 93:  HAMMER BOT
		AddDrillBot,						// 94:  drill bot
		AddSwingerBot,						// 95:  swinger bot
		AddLavaStone,						// 96:  lava stone
		AddSnowball,						// 97: 	snowball
		AddLavaPlatform,					// 98:  lava platform
		AddSmoker,							// 99:  smoker
		AddRadarDish,						// 100:  tower / radar dish
		AddPeopleHut,						// 101: people hut
		AddBeemer,							// 102:  bemmer
		NilAdd,								// 103:  rail gun
		AddTurret,							// 104:  turret
		AddEnemy_BrainBoss,					// 105:  brain boss
		AddBlobArrow,						// 106:  blob arrow
		AddNeuronStrand,					// 107:  neuron strand
		AddBrainPort,						// 108:  brain port */
