import { ItemParams } from "./itemParams";

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

export type OttoItemParams = ItemParams;

const ottoDefaultParams: OttoItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const ottoItemTypeParams: Record<ItemType, OttoItemParams> = {
  [ItemType.StartCoords]: {
    flags: "Used internally by terrain system",
    p0: {
      type: "Integer",
      description: "Starting aim direction (0-7)",
      codeSample: {
        code: "gPlayerInfo.startRotY = (float)itemPtr[i].parm[0] * (PI2/8.0f); // calc starting rotation aim",
        fileName: "Terrain2.c",
        lineNumber: 282,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BasicPlant]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Plant type (0=Farm Tree, 1=Jungle Fern, 2=Jungle Flower, 3=Jungle Leafy Plant, 4=Cloud Tree, 5=Snow Tree)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get plant type",
        fileName: "Items/Items.c",
        lineNumber: 394,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SpacePodGenerator]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0=0°, 1=180°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 145,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Squooshy]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1))",
            fileName: "Enemies/FireIce/Enemy_Squooshy.c",
            lineNumber: 95,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/FireIce/Enemy_Squooshy.c",
            lineNumber: 104,
          },
        },
      ],
    },
  },
  [ItemType.Human]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Human type (0=Farmer, 1=Beewoman, 2=Scientist, 3=Skirtlady)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get human type",
        fileName: "Items/Items.c",
        lineNumber: 1139,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Encased in ice" }],
    },
  },
  [ItemType.Atom]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Atom type (0=Red, 1=Green, 2=Blue)",
      codeSample: {
        code: "newObj = MakeAtom(x,ty + yoff,z, itemPtr->parm[0]);",
        fileName: "Items/Powerups.c",
        lineNumber: 131,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Auto-regenerate",
          codeSample: {
            code: "newObj->POWRegenerate = itemPtr->parm[3] & 1;",
            fileName: "Items/Powerups.c",
            lineNumber: 136,
          },
        },
        {
          index: 1,
          description: "Put on terrain only",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<1))",
            fileName: "Items/Powerups.c",
            lineNumber: 128,
          },
        },
      ],
    },
  },
  [ItemType.PowerupPod]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Powerup type (0=StunPulse, 1=Health, 2=JumpJet, 3=Fuel, 4=SuperNova, 5=Freeze, 6=Magnet, 7=Growth, 8=Flame, 9=Flare, 10=Dart, 11=FreeLife)",
      codeSample: {
        code: "newObj->POWType = itemPtr->parm[0];",
        fileName: "Items/Powerups.c",
        lineNumber: 626,
      },
    },
    p1: {
      type: "Integer",
      description: "Atom quantity (if atom type)",
      codeSample: {
        code: "newObj->AtomQuantity = itemPtr->parm[1];",
        fileName: "Items/Powerups.c",
        lineNumber: 627,
      },
    },
    p2: {
      type: "Integer",
      description: "Special parameter for specific uses",
      codeSample: {
        code: "newObj->PowerupParm2 = itemPtr->parm[2];",
        fileName: "Items/Powerups.c",
        lineNumber: 631,
      },
    },
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Auto-regenerate",
          codeSample: {
            code: "newObj->POWRegenerate = itemPtr->parm[3] & 1;",
            fileName: "Items/Powerups.c",
            lineNumber: 634,
          },
        },
        {
          index: 1,
          description: "Put on terrain only",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<1))",
            fileName: "Items/Powerups.c",
            lineNumber: 593,
          },
        },
        {
          index: 2,
          description: "Balloon container (cloud level)",
          codeSample: {
            code: "if (itemPtr->parm[3] & (1<<2))",
            fileName: "Items/Powerups.c",
            lineNumber: 601,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_BrainAlien]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Onion]: {
    flags: "Auto-fade status bits",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/Farm/Enemy_Onion.c",
            lineNumber: 100,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/Farm/Enemy_Onion.c",
            lineNumber: 108,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Corn]: {
    flags: "Auto-fade status bits",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/Farm/Enemy_Corn.c",
            lineNumber: 98,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/Farm/Enemy_Corn.c",
            lineNumber: 107,
          },
        },
      ],
    },
  },
  [ItemType.Enemy_Tomato]: {
    flags: "Auto-fade status bits",
    p0: "Unknown",
    p1: "Unknown",
    p2: "Unknown",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/Farm/Enemy_Tomato.c",
            lineNumber: 100,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/Farm/Enemy_Tomato.c",
            lineNumber: 109,
          },
        },
      ],
    },
  },
  [ItemType.Barn]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Silo]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.WoodenGate]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.PhonePole]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Tractor]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Sprout]: {
    flags: "Auto-fade status bits | Saucer target",
    p0: {
      type: "Integer",
      description: "Gate type (0=Wood, 1=Metal)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get gate type",
        fileName: "Items/Items.c",
        lineNumber: 629,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CornStalk]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BigLeafPlant]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.MetalGate]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Gate type (0=Wood, 1=Metal)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.FencePost]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Post type (0=Wood Farm, 1=Metal Farm, 2=Wood Jungle, 3=Crunch Apocalypse, 4=Brass Cloud, 5=Rock FireIce, 6=Ice FireIce, 7=Neuron Brain)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get post type",
        fileName: "Items/Items.c",
        lineNumber: 629,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Windmill]: {
    flags: "Auto-fade status bits | Keep back faces | No texture wrap",
    p0: {
      type: "Integer",
      description: "Rotation (0=0°, 1=90°, 2=180°, 3=270°)",
      codeSample: {
        code: "gNewObjectDefinition.rot = r = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 708,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.MetalTub]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.OutHouse]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 543,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Rock]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rock type (0=Small, 1=Large)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get rock type",
        fileName: "Items/Items.c",
        lineNumber: 565,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Hay]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Hay bale type (0=Regular, 1=Round)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get hay type",
        fileName: "Items/Items.c",
        lineNumber: 595,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 606,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.ExitRocket]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Checkpoint]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: {
      type: "Integer",
      description: "Player rotation (0-3, multiplied by PI2/4)",
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SlimePipe]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Pipe type (0=FancyJ, 1=BentTube, 2=StraightTube, 3=LongU, 4=ShortU, 5=GrateTube)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get pipe type",
        fileName: "Items/Items.c",
        lineNumber: 885,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 606,
      },
    },
    p2: {
      type: "Integer",
      description: "Slime color (0=Green, 1=Red, 2=Purple)",
      codeSample: {
        code: "slime->OozeColor = itemPtr->parm[2];",
        fileName: "Items/Items.c",
        lineNumber: 885,
      },
    },
    p3: "Unused",
  },
  [ItemType.FallingCrystal]: {
    flags: "Auto-fade status bits | Hidden (starts underground)",
    p0: {
      type: "Integer",
      description: "Rotation (0-7, multiplied by PI2/8)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI2/8.0f);",
        fileName: "Items/Items.c",
        lineNumber: 1344,
      },
    },
    p1: {
      type: "Integer",
      description: "Crystal color (0=Blue, 1=Green, 2=Red)",
      codeSample: {
        code: "switch(itemPtr->parm[1]) { ... }",
        fileName: "Items/Items.c",
        lineNumber: 1386,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.MachineBoss]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BlobBossTube]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Tube type (0=Bent, 1=Straight)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get tube type",
        fileName: "Items/Items.c",
        lineNumber: 1672,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * PI/2;",
        fileName: "Items/Items.c",
        lineNumber: 1682,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.ScaffoldingPost]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Post type (0-3)",
      codeSample: {
        code: "short type = itemPtr->parm[0]; // get post type",
        fileName: "Items/Items.c",
        lineNumber: 1707,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Rubble]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rubble type (0-6)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get rubble type",
        fileName: "Items/Items.c",
        lineNumber: 1904,
      },
    },
    p1: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI2/4)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[1] * (PI2/4.0f);",
        fileName: "Items/Items.c",
        lineNumber: 1919,
      },
    },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.JungleGate]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 545,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CrunchDoor]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 545,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Manhole]: {
    flags: "Auto-fade status bits | Rot Z,X,Y",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 545,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CloudPlatform]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Platform type (0-2)",
      codeSample: {
        code: "int type = itemPtr->parm[0]; // get platform type",
        fileName: "Items/Items.c",
        lineNumber: 1139,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CloudTunnel]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 545,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Flamester]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_GiantLizard]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_FlyTrap]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Mantis]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TurtlePlatform]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Smashable]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Smashable type (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.LeafPlatform]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Platform type (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI2/4)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.HelpBeacon]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Teleporter]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Teleporter ID (0-19)" },
    p1: { type: "Integer", description: "Destination ID (0-19)" },
    p2: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p3: "Unused",
  },
  [ItemType.ZipLinePost]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Post type (0=Start, 1=End)" },
    p1: { type: "Integer", description: "Zipline ID (0-15)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Mutant]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Blob]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BumperBubble]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Bubble type (0=Regular, 1=Large)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BasicCrystal]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Crystal type (0=Blue, 1=Green, 2=Red, 3=Purple)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.InertBubble]: {
    flags: "Auto-fade status bits | Aim at camera | Glow",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SlimeTree]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Tree type (0=Animating Large, 1=Static Large, 2=Static Small)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.MagnetMonster]: {
    flags: "Auto-fade status bits | On spline",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.FallingSlimePlatform]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Platform type (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BubblePump]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-3, multiplied by PI2/4)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SlimeMech]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Rotation (0-3, multiplied by PI/2)",
      codeSample: {
        code: "gNewObjectDefinition.rot = (float)itemPtr->parm[0] * (PI/2);",
        fileName: "Items/Items.c",
        lineNumber: 545,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.SpinningPlatform]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Platform type (0-19)" },
    p1: {
      type: "Integer",
      description: "Spin offset (0-7, multiplied by PI2/8)",
    },
    p2: { type: "Integer", description: "Height offset (multiplied by 10)" },
    p3: {
      type: "Bit Flags",
      flags: [{ index: 0, description: "Spin direction (0=CW, 1=CCW)" }],
    },
  },
  [ItemType.MovingPlatform]: {
    flags: "Auto-fade status bits | On spline",
    p0: {
      type: "Integer",
      description: "Platform type (0=Blue, 1=Red, 2=Yellow, 3=Green)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_MutantRobot]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.HumanScientist]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description:
        "Scientist type (forced to 2=Scientist by AddHumanScientist)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.ProximityMine]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Mine type (0=Round, 1=Square)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.LampPost]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Lamp post type (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.DebrisGate]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Gate type (0=Open, 1=Blocked with debris)",
    },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.GraveStone]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Gravestone type (0-4)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI2/4)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.CrashedShip]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Ship type (0-2)" },
    p1: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.ChainReactingMine]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Mine type (0=Round, 1=Square)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TeleporterMap]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Map type (0-4)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.GreenSteam]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Steam type (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TentacleGenerator]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Generator type (controls spawning behavior)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.PitcherPlantBoss]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.PitcherPod]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Pod type (controls pod variant and behavior)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TractorBeamPost]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Post type (controls tractor beam configuration)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Cannon]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-3, multiplied by PI2/4)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BumperCar]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Car color (0=Red, 1=Blue, 2=Green, 3=Yellow)",
    },
    p1: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TireBumperStrip]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Strip type (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_Clown]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/Cloud/Enemy_Clown.c",
            lineNumber: 118,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/Cloud/Enemy_Clown.c",
            lineNumber: 126,
          },
        },
      ],
    },
  },
  [ItemType.Clownfish]: {
    flags: "Auto-fade status bits | On spline",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BumperCarPowerPost]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Generator ID" },
    p1: { type: "Integer", description: "Area number" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_StrongMan]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BumperCarGate]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Gate type (0=Open, 1=Blocked)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.RocketSled]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.TrapDoor]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Door type (0-2)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.ZigZagSlats]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Slat configuration (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Unknown]: ottoDefaultParams,
  [ItemType.LavaPillar]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Pillar type (0-2)" },
    p1: { type: "Integer", description: "Height variation" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.VolcanoGeneratorZone]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Generator frequency" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.JawsBot]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Bot type" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.IceSaucer]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Saucer type" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.RunwayLights]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Light pattern (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_IceCube]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.HammerBot]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/FireIce/Enemy_HammerBot.c",
            lineNumber: 91,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/FireIce/Enemy_HammerBot.c",
            lineNumber: 99,
          },
        },
      ],
    },
  },
  [ItemType.DrillBot]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/FireIce/Enemy_DrillBot.c",
            lineNumber: 90,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/FireIce/Enemy_DrillBot.c",
            lineNumber: 99,
          },
        },
      ],
    },
  },
  [ItemType.SwingerBot]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: {
      type: "Bit Flags",
      flags: [
        {
          index: 0,
          description: "Always add (ignore max limit)",
          codeSample: {
            code: "if (!(itemPtr->parm[3] & 1)) { /* check max limit */ }",
            fileName: "Enemies/FireIce/Enemy_SwingerBot.c",
            lineNumber: 85,
          },
        },
        {
          index: 1,
          description: "Enemy regenerate",
          codeSample: {
            code: "body->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
            fileName: "Enemies/FireIce/Enemy_SwingerBot.c",
            lineNumber: 95,
          },
        },
      ],
    },
  },
  [ItemType.LavaStone]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Stone type (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Snowball]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Snowball size (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.LavaPlatform]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Platform type (0-2)" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Smoker]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Smoker type (0-2)",
      codeSample: {
        code: "newObj->Kind = itemPtr->parm[0]; // save smoke kind",
        fileName: "Effects/Effects.c",
        lineNumber: 1685,
      },
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.RadarDish]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Dish type (0=Tower, 1=Radar)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.PeopleHut]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Number of humans" },
    p1: { type: "Integer", description: "Human type" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Beemer]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Beemer type" },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Railgun]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Gun orientation" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Turret]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Turret type" },
    p1: { type: "Integer", description: "Rotation (0-7, multiplied by PI2/8)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.Enemy_BrainBoss]: {
    flags: "Auto-fade status bits",
    p0: "Unused",
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BlobArrow]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Arrow direction (0-7, multiplied by PI2/8)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.NeuronStrand]: {
    flags: "Auto-fade status bits",
    p0: { type: "Integer", description: "Strand type (0-3)" },
    p1: { type: "Integer", description: "Rotation (0-3, multiplied by PI/2)" },
    p2: "Unused",
    p3: "Unused",
  },
  [ItemType.BrainPort]: {
    flags: "Auto-fade status bits",
    p0: {
      type: "Integer",
      description: "Portal ID (0-7, also controls rotation)",
    },
    p1: "Unused",
    p2: "Unused",
    p3: "Unused",
  },
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
