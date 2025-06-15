import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  Cactus, // 1
  WaterPatch, // 2
  Sign, // 3 Signs
  Tree, // 4
  POW, // 5
  FinishLine, // 6
  Vase, // 7
  Rickshaw, // 8
  FlagPole, // 9 Flagpole
  Waterfall, // 10 waterfall
  Token, // 11 token (arrowhead, etc.)
  StickyTiresPOW, // 12
  SuspensionPOW, // 13
  EasterHead, // 14
  DustDevil, // 15
  SnoMan, // 16
  CampFire, // 17
  Yeti, // 18 Yeti
  LavaGenerator, // 19 Lava Generator
  Pillar, // 20 pillar
  Pylon, // 21 pylon
  Boat, // 22 solar boat
  CamelSpline, // 23 camel - SPLINE
  Statue, // 24 statue
  Sphinx, // 25 sphinx head
  TeamTorch, // 26 team torch
  TeamBase, // 27 team base
  BubbleGenerator, // 28
  InvisibilityPOW, // 29
  Rock, // 30 rock
  BrontoNeck, // 31 brontosaur neck
  RockOverhang, // 32 rock overhang
  Vine, // 33 Vine
  AztecHead, // 34 Aztec Head
  BeetleSpline, // 35 beetle- spline
  CastleTower, // 36 castle tower
  Catapult, // 37 catapult
  Gong, // 38 Gong
  House, // 39 Houses
  Cauldron, // 40 Cauldron
  Well, // 41 Well
  Volcano, // 42 volcano
  Clock, // 43 crete clock
  Goddess, // 44 Goddess
  StoneHenge, // 45 stone henge
  Coliseum, // 46 Coliseum
  Stump, // 47 Stump
  Baracade, // 48 Baracade
  VikingFlag, // 49 Viking Flag
  TorchPot, // 50 Torchpot
  Cannon, // 51 Cannon
  Clam, // 52 Clam
  SharkSpline, // 53 Shark - spline
  TrollSpline, // 54 troll - spline
  WeaponsRack, // 55 weapons rack
  Capsule, // 56 Capsule
  SeaMine, // 57 Sea Mine
  PteradactylSpline, // 58 Pteradactyl - spline
  Dragon, // 59 Chinese Dragon
  TarPatch, // 60 Tar Patch
  MummySpline, // 61 Mummy -spline
  TotemPole, // 62 Totem Pole
  Druid, // 63 Druid
  PolarBearSpline, // 64 Polar Bear - spline
  Flower, // 65 flower
  VikingSpline, // 66 Viking - spline
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.Cactus]: "Cactus",
  [ItemType.WaterPatch]: "WaterPatch",
  [ItemType.Sign]: "Sign",
  [ItemType.Tree]: "Tree",
  [ItemType.POW]: "POW",
  [ItemType.FinishLine]: "FinishLine",
  [ItemType.Vase]: "Vase",
  [ItemType.Rickshaw]: "Rickshaw",
  [ItemType.FlagPole]: "FlagPole",
  [ItemType.Waterfall]: "Waterfall",
  [ItemType.Token]: "Token",
  [ItemType.StickyTiresPOW]: "StickyTiresPOW",
  [ItemType.SuspensionPOW]: "SuspensionPOW",
  [ItemType.EasterHead]: "EasterHead",
  [ItemType.DustDevil]: "DustDevil",
  [ItemType.SnoMan]: "SnoMan",
  [ItemType.CampFire]: "CampFire",
  [ItemType.Yeti]: "Yeti",
  [ItemType.LavaGenerator]: "LavaGenerator",
  [ItemType.Pillar]: "Pillar",
  [ItemType.Pylon]: "Pylon",
  [ItemType.Boat]: "Boat",
  [ItemType.CamelSpline]: "CamelSpline",
  [ItemType.Statue]: "Statue",
  [ItemType.Sphinx]: "Sphinx",
  [ItemType.TeamTorch]: "TeamTorch",
  [ItemType.TeamBase]: "TeamBase",
  [ItemType.BubbleGenerator]: "BubbleGenerator",
  [ItemType.InvisibilityPOW]: "InvisibilityPOW",
  [ItemType.Rock]: "Rock",
  [ItemType.BrontoNeck]: "BrontoNeck",
  [ItemType.RockOverhang]: "RockOverhang",
  [ItemType.Vine]: "Vine",
  [ItemType.AztecHead]: "AztecHead",
  [ItemType.BeetleSpline]: "BeetleSpline",
  [ItemType.CastleTower]: "CastleTower",
  [ItemType.Catapult]: "Catapult",
  [ItemType.Gong]: "Gong",
  [ItemType.House]: "House",
  [ItemType.Cauldron]: "Cauldron",
  [ItemType.Well]: "Well",
  [ItemType.Volcano]: "Volcano",
  [ItemType.Clock]: "Clock",
  [ItemType.Goddess]: "Goddess",
  [ItemType.StoneHenge]: "StoneHenge",
  [ItemType.Coliseum]: "Coliseum",
  [ItemType.Stump]: "Stump",
  [ItemType.Baracade]: "Baracade",
  [ItemType.VikingFlag]: "VikingFlag",
  [ItemType.TorchPot]: "TorchPot",
  [ItemType.Cannon]: "Cannon",
  [ItemType.Clam]: "Clam",
  [ItemType.SharkSpline]: "SharkSpline",
  [ItemType.TrollSpline]: "TrollSpline",
  [ItemType.WeaponsRack]: "WeaponsRack",
  [ItemType.Capsule]: "Capsule",
  [ItemType.SeaMine]: "SeaMine",
  [ItemType.PteradactylSpline]: "PteradactylSpline",
  [ItemType.Dragon]: "Dragon",
  [ItemType.TarPatch]: "TarPatch",
  [ItemType.MummySpline]: "MummySpline",
  [ItemType.TotemPole]: "TotemPole",
  [ItemType.Druid]: "Druid",
  [ItemType.PolarBearSpline]: "PolarBearSpline",
  [ItemType.Flower]: "Flower",
  [ItemType.VikingSpline]: "VikingSpline",
};

export type CroMagItemParams = ItemParams;

const croMagDefaultParams: CroMagItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const croMagItemTypeParams: Record<ItemType, CroMagItemParams> = {
  [ItemType.StartCoords]: croMagDefaultParams,
  [ItemType.Cactus]: croMagDefaultParams,
  [ItemType.WaterPatch]: croMagDefaultParams,
  [ItemType.Sign]: croMagDefaultParams,
  [ItemType.Tree]: croMagDefaultParams,
  [ItemType.POW]: croMagDefaultParams,
  [ItemType.FinishLine]: croMagDefaultParams,
  [ItemType.Vase]: croMagDefaultParams,
  [ItemType.Rickshaw]: croMagDefaultParams,
  [ItemType.FlagPole]: croMagDefaultParams,
  [ItemType.Waterfall]: croMagDefaultParams,
  [ItemType.Token]: croMagDefaultParams,
  [ItemType.StickyTiresPOW]: croMagDefaultParams,
  [ItemType.SuspensionPOW]: croMagDefaultParams,
  [ItemType.EasterHead]: croMagDefaultParams,
  [ItemType.DustDevil]: croMagDefaultParams,
  [ItemType.SnoMan]: croMagDefaultParams,
  [ItemType.CampFire]: croMagDefaultParams,
  [ItemType.Yeti]: croMagDefaultParams,
  [ItemType.LavaGenerator]: croMagDefaultParams,
  [ItemType.Pillar]: croMagDefaultParams,
  [ItemType.Pylon]: croMagDefaultParams,
  [ItemType.Boat]: croMagDefaultParams,
  [ItemType.CamelSpline]: croMagDefaultParams,
  [ItemType.Statue]: croMagDefaultParams,
  [ItemType.Sphinx]: croMagDefaultParams,
  [ItemType.TeamTorch]: croMagDefaultParams,
  [ItemType.TeamBase]: croMagDefaultParams,
  [ItemType.BubbleGenerator]: croMagDefaultParams,
  [ItemType.InvisibilityPOW]: croMagDefaultParams,
  [ItemType.Rock]: croMagDefaultParams,
  [ItemType.BrontoNeck]: croMagDefaultParams,
  [ItemType.RockOverhang]: croMagDefaultParams,
  [ItemType.Vine]: croMagDefaultParams,
  [ItemType.AztecHead]: croMagDefaultParams,
  [ItemType.BeetleSpline]: croMagDefaultParams,
  [ItemType.CastleTower]: croMagDefaultParams,
  [ItemType.Catapult]: croMagDefaultParams,
  [ItemType.Gong]: croMagDefaultParams,
  [ItemType.House]: croMagDefaultParams,
  [ItemType.Cauldron]: croMagDefaultParams,
  [ItemType.Well]: croMagDefaultParams,
  [ItemType.Volcano]: croMagDefaultParams,
  [ItemType.Clock]: croMagDefaultParams,
  [ItemType.Goddess]: croMagDefaultParams,
  [ItemType.StoneHenge]: croMagDefaultParams,
  [ItemType.Coliseum]: croMagDefaultParams,
  [ItemType.Stump]: croMagDefaultParams,
  [ItemType.Baracade]: croMagDefaultParams,
  [ItemType.VikingFlag]: croMagDefaultParams,
  [ItemType.TorchPot]: croMagDefaultParams,
  [ItemType.Cannon]: croMagDefaultParams,
  [ItemType.Clam]: croMagDefaultParams,
  [ItemType.SharkSpline]: croMagDefaultParams,
  [ItemType.TrollSpline]: croMagDefaultParams,
  [ItemType.WeaponsRack]: croMagDefaultParams,
  [ItemType.Capsule]: croMagDefaultParams,
  [ItemType.SeaMine]: croMagDefaultParams,
  [ItemType.PteradactylSpline]: croMagDefaultParams,
  [ItemType.Dragon]: croMagDefaultParams,
  [ItemType.TarPatch]: croMagDefaultParams,
  [ItemType.MummySpline]: croMagDefaultParams,
  [ItemType.TotemPole]: croMagDefaultParams,
  [ItemType.Druid]: croMagDefaultParams,
  [ItemType.PolarBearSpline]: croMagDefaultParams,
  [ItemType.Flower]: croMagDefaultParams,
  [ItemType.VikingSpline]: croMagDefaultParams,
};
