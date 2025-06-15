import { ItemParams } from "../items/itemParams";

export enum SplineItemType {
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
  _Yeti, // 18 Yeti
  LavaGenerator, // 19 Lava Generator
  Pillar, // 20 pillar
  Pylon, // 21 pylon
  Boat, // 22 solar boat
  _Camel, // 23 camel - SPLINE
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
  _Beetle, // 35 beetle- spline
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
  _SharkSpline, // 53 Shark - spline
  _TrollSpline, // 54 troll - spline
  WeaponsRack, // 55 weapons rack
  Capsule, // 56 Capsule
  SeaMine, // 57 Sea Mine
  _PteradactylSpline, // 58 Pteradactyl - spline
  Dragon, // 59 Chinese Dragon
  TarPatch, // 60 Tar Patch
  _MymmySpline, // 61 Mummy -spline
  TotemPole, // 62 Totem Pole
  Druid, // 63 Druid
  _PolarBearSpline, // 64 Polar Bear - spline
  Flower, // 65 flower
  _VikingSplinne, // 66 Viking - spline
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.StartCoords]: "My Start Coords",
  [SplineItemType.Cactus]: "Cactus",
  [SplineItemType.WaterPatch]: "Water Patch",
  [SplineItemType.Sign]: "Sign",
  [SplineItemType.Tree]: "Tree",
  [SplineItemType.POW]: "POW",
  [SplineItemType.FinishLine]: "Finish Line",
  [SplineItemType.Vase]: "Vase",
  [SplineItemType.Rickshaw]: "Rickshaw",
  [SplineItemType.FlagPole]: "Flag Pole",
  [SplineItemType.Waterfall]: "Waterfall",
  [SplineItemType.Token]: "Token",
  [SplineItemType.StickyTiresPOW]: "Sticky Tires POW",
  [SplineItemType.SuspensionPOW]: "Suspension POW",
  [SplineItemType.EasterHead]: "Easter Head",
  [SplineItemType.DustDevil]: "Dust Devil",
  [SplineItemType.SnoMan]: "Sno Man",
  [SplineItemType.CampFire]: "Camp Fire",
  [SplineItemType._Yeti]: "Yeti",
  [SplineItemType.LavaGenerator]: "Lava Generator",
  [SplineItemType.Pillar]: "Pillar",
  [SplineItemType.Pylon]: "Pylon",
  [SplineItemType.Boat]: "Solar Boat",
  [SplineItemType._Camel]: "Camel - Spline",
  [SplineItemType.Statue]: "Statue",
  [SplineItemType.Sphinx]: "Sphinx Head",
  [SplineItemType.TeamTorch]: "Team Torch",
  [SplineItemType.TeamBase]: "Team Base",
  [SplineItemType.BubbleGenerator]: "Bubble Generator",
  [SplineItemType.InvisibilityPOW]: "Invisibility POW",
  [SplineItemType.Rock]: "Rock",
  [SplineItemType.BrontoNeck]: "Brontosaur Neck",
  [SplineItemType.RockOverhang]: "Rock Overhang",
  [SplineItemType.Vine]: "Vine",
  [SplineItemType.AztecHead]: "Aztec Head",
  [SplineItemType._Beetle]: "Beetle - Spline",
  [SplineItemType.CastleTower]: "Castle Tower",
  [SplineItemType.Catapult]: "Catapult",
  [SplineItemType.Gong]: "Gong",
  [SplineItemType.House]: "Houses",
  [SplineItemType.Cauldron]: "Cauldron",
  [SplineItemType.Well]: "Well",
  [SplineItemType.Volcano]: "Volcano",
  [SplineItemType.Clock]: "Crete Clock",
  [SplineItemType.Goddess]: "Goddess",
  [SplineItemType.StoneHenge]: "Stone Henge",
  [SplineItemType.Coliseum]: "Coliseum",
  [SplineItemType.Stump]: "Stump",
  [SplineItemType.Baracade]: "Baracade",
  [SplineItemType.VikingFlag]: "Viking Flag",
  [SplineItemType.TorchPot]: "Torchpot",
  [SplineItemType.Cannon]: "Cannon",
  [SplineItemType.Clam]: "Clam",
  [SplineItemType._SharkSpline]: "Shark - Spline",
  [SplineItemType._TrollSpline]: "Troll - Spline",
  [SplineItemType.WeaponsRack]: "Weapons Rack",
  [SplineItemType.Capsule]: "Capsule",
  [SplineItemType.SeaMine]: "Sea Mine",
  [SplineItemType._PteradactylSpline]: "Pteradactyl - Spline",
  [SplineItemType.Dragon]: "Chinese Dragon",
  [SplineItemType.TarPatch]: "Tar Patch",
  [SplineItemType._MymmySpline]: "Mummy -Spline",
  [SplineItemType.TotemPole]: "Totem Pole",
  [SplineItemType.Druid]: "Druid",
  [SplineItemType._PolarBearSpline]: "Polar Bear - Spline",
  [SplineItemType.Flower]: "Flower",
  [SplineItemType._VikingSplinne]: "Viking - Spline",
};

// Default parameter description for spline items that haven't been researched yet
const defaultParams: ItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

// Parameter descriptions for each spline item type
export const croMagSplineItemTypeParams: Record<SplineItemType, ItemParams> = {
  [SplineItemType.StartCoords]: defaultParams,
  [SplineItemType.Cactus]: defaultParams,
  [SplineItemType.WaterPatch]: defaultParams,
  [SplineItemType.Sign]: defaultParams,
  [SplineItemType.Tree]: defaultParams,
  [SplineItemType.POW]: defaultParams,
  [SplineItemType.FinishLine]: defaultParams,
  [SplineItemType.Vase]: defaultParams,
  [SplineItemType.Rickshaw]: defaultParams,
  [SplineItemType.FlagPole]: defaultParams,
  [SplineItemType.Waterfall]: defaultParams,
  [SplineItemType.Token]: defaultParams,
  [SplineItemType.StickyTiresPOW]: defaultParams,
  [SplineItemType.SuspensionPOW]: defaultParams,
  [SplineItemType.EasterHead]: defaultParams,
  [SplineItemType.DustDevil]: defaultParams,
  [SplineItemType.SnoMan]: defaultParams,
  [SplineItemType.CampFire]: defaultParams,
  [SplineItemType._Yeti]: defaultParams,
  [SplineItemType.LavaGenerator]: defaultParams,
  [SplineItemType.Pillar]: defaultParams,
  [SplineItemType.Pylon]: defaultParams,
  [SplineItemType.Boat]: defaultParams,
  [SplineItemType._Camel]: defaultParams,
  [SplineItemType.Statue]: defaultParams,
  [SplineItemType.Sphinx]: defaultParams,
  [SplineItemType.TeamTorch]: defaultParams,
  [SplineItemType.TeamBase]: defaultParams,
  [SplineItemType.BubbleGenerator]: defaultParams,
  [SplineItemType.InvisibilityPOW]: defaultParams,
  [SplineItemType.Rock]: defaultParams,
  [SplineItemType.BrontoNeck]: defaultParams,
  [SplineItemType.RockOverhang]: defaultParams,
  [SplineItemType.Vine]: defaultParams,
  [SplineItemType.AztecHead]: defaultParams,
  [SplineItemType._Beetle]: defaultParams,
  [SplineItemType.CastleTower]: defaultParams,
  [SplineItemType.Catapult]: defaultParams,
  [SplineItemType.Gong]: defaultParams,
  [SplineItemType.House]: defaultParams,
  [SplineItemType.Cauldron]: defaultParams,
  [SplineItemType.Well]: defaultParams,
  [SplineItemType.Volcano]: defaultParams,
  [SplineItemType.Clock]: defaultParams,
  [SplineItemType.Goddess]: defaultParams,
  [SplineItemType.StoneHenge]: defaultParams,
  [SplineItemType.Coliseum]: defaultParams,
  [SplineItemType.Stump]: defaultParams,
  [SplineItemType.Baracade]: defaultParams,
  [SplineItemType.VikingFlag]: defaultParams,
  [SplineItemType.TorchPot]: defaultParams,
  [SplineItemType.Cannon]: defaultParams,
  [SplineItemType.Clam]: defaultParams,
  [SplineItemType._SharkSpline]: defaultParams,
  [SplineItemType._TrollSpline]: defaultParams,
  [SplineItemType.WeaponsRack]: defaultParams,
  [SplineItemType.Capsule]: defaultParams,
  [SplineItemType.SeaMine]: defaultParams,
  [SplineItemType._PteradactylSpline]: defaultParams,
  [SplineItemType.Dragon]: defaultParams,
  [SplineItemType.TarPatch]: defaultParams,
  [SplineItemType._MymmySpline]: defaultParams,
  [SplineItemType.TotemPole]: defaultParams,
  [SplineItemType.Druid]: defaultParams,
  [SplineItemType._PolarBearSpline]: defaultParams,
  [SplineItemType.Flower]: defaultParams,
  [SplineItemType._VikingSplinne]: defaultParams,
};
