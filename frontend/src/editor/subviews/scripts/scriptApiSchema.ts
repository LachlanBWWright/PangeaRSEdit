import { z } from "zod";
import { billyFrontierItemTypeParams as billyItemParams, itemTypeNames as billyItemTypeNames } from "@/data/items/billyFrontierItemType";
import { bugdomItemTypeParams as bugdomItemParams, itemTypeNames as bugdomItemTypeNames } from "@/data/items/bugdomItemType";
import { bugdom2ItemTypeParams as bugdom2ItemParams, itemTypeNames as bugdom2ItemTypeNames } from "@/data/items/bugdom2ItemType";
import { croMagItemTypeParams as croMagItemParams, itemTypeNames as croMagItemTypeNames } from "@/data/items/croMagItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "@/data/items/mightyMikeItemType";
import { itemTypeNames as nanosaurItemTypeNames, nanosaurItemTypeParams as nanosaurItemParams } from "@/data/items/nanosaurItemType";
import { itemTypeNames as nanosaur2ItemTypeNames, nanosaur2ItemTypeParams as nanosaur2ItemParams } from "@/data/items/nanosaur2ItemType";
import { itemTypeNames as ottoItemTypeNames, TerrainItemTypeParams as ottoItemParams } from "@/data/items/ottoItemType";
import type { ItemParams, ParamDescription } from "@/data/items/itemParams";

export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "vector2",
  "vector3",
  "objectHandle",
  "stringUnion",
  "table",
  "function",
  "unknown",
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  description: z.string().optional(),
  optional: z.boolean().optional(),
  unionValues: z.array(z.string()).optional(),
});

export type Field = z.infer<typeof FieldSchema>;

export const HookSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  contextType: z.string(),
  returnType: z.string(),
});

export type Hook = z.infer<typeof HookSchema>;

export const ApiAvailabilityCapabilitySchema = z.enum([
  "nativeSpawn",
  "scriptedSpawn",
  "playerLookup",
  "playerCommands",
  "playerInvulnerability",
  "raceMetadata",
  "objectiveMetadata",
  "objectCollision",
  "levelMetadata",
  "persistence",
]);

export type ApiAvailabilityCapability = z.infer<
  typeof ApiAvailabilityCapabilitySchema
>;

export const ApiFunctionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  completion: z.enum(["native-spawn"]).optional(),
  availabilityCapability: ApiAvailabilityCapabilitySchema.optional(),
  parameters: z.array(FieldSchema),
  returnType: z.string(),
  command: z
    .object({
      capability: z.string().min(1),
      authority: z.enum(["local", "host", "owner", "disabled-network"]),
      applicationPhase: z.enum(["callback", "next-engine-phase"]),
      validation: z.array(z.string().min(1)).min(1),
    })
    .optional(),
});

export type ApiFunction = z.infer<typeof ApiFunctionSchema>;

type CommandMetadata = NonNullable<ApiFunction["command"]>;

const OBJECT_COMMAND_METADATA: Readonly<Record<"position" | "positionOffset" | "velocity" | "rotation" | "scale" | "animation" | "collision" | "activation" | "delete", CommandMetadata>> = {
  position: {
    capability: "object-position",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  positionOffset: {
    capability: "object-position-offset",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3", "only during onObjectFrame"],
  },
  velocity: {
    capability: "object-velocity",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  rotation: {
    capability: "object-rotation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite Vector3"],
  },
  scale: {
    capability: "object-scale",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite scale in range 0.000001..100"],
  },
  animation: {
    capability: "object-animation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "finite speed and blend seconds", "declared animation index or name"],
  },
  collision: {
    capability: "object-collision",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "boolean enabled state", "adapter collision toggle support"],
  },
  activation: {
    capability: "object-activation",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "enabled-state transition"],
  },
  delete: {
    capability: "object-delete",
    authority: "disabled-network",
    applicationPhase: "callback",
    validation: ["generation-checked handle", "delete capability"],
  },
};

const PLAYER_COMMAND_METADATA: CommandMetadata = {
  capability: "player-health",
  authority: "disabled-network",
  applicationPhase: "callback",
  validation: ["integer player index", "finite health in range 0..1", "adapter health mutation support"],
};

const PLAYER_POSITION_COMMAND_METADATA: CommandMetadata = {
  capability: "player-position",
  authority: "disabled-network",
  applicationPhase: "callback",
  validation: ["integer player index", "finite Vector3", "adapter player-position mutation support"],
};

const PLAYER_VELOCITY_COMMAND_METADATA: CommandMetadata = {
  capability: "player-velocity",
  authority: "disabled-network",
  applicationPhase: "callback",
  validation: ["integer player index", "finite Vector3", "adapter player-velocity mutation support"],
};

const PLAYER_HEAL_COMMAND_METADATA: CommandMetadata = {
  capability: "player-heal",
  authority: "disabled-network",
  applicationPhase: "callback",
  validation: ["integer player index", "finite non-negative health amount in range 0..1", "adapter health read and mutation support"],
};

const PLAYER_INVULNERABILITY_COMMAND_METADATA: CommandMetadata = {
  capability: "player-invulnerability",
  authority: "disabled-network",
  applicationPhase: "callback",
  validation: ["integer player index", "finite duration in range 0..3600 seconds", "adapter invulnerability timer support"],
};

export const NativeSpawnSchema = z.object({
  id: z.string(),
  nativeType: z.number().int().nonnegative().optional(),
  label: z.string(),
  category: z.string(),
  description: z.string(),
  params: z.array(z.object({ name: z.string(), description: z.string(), values: z.array(z.string()).optional() })).default([]),
  audit: z.object({
    classification: z.enum(["directly-replaceable", "replaceable-with-native-hooks", "native-only"]),
    replacementSurface: z.enum(["terrain", "spline", "map", "none"]),
    fallback: z.enum(["native-initializer", "skip-replacement"]),
    requiredCapabilities: z.array(z.string().min(1)).min(1),
    requiredAssets: z.array(z.string().min(1)).min(1),
    lifecycle: z.enum(["stateless", "pickup", "trigger", "native-owned"]),
    modeAudit: z.enum(["all-declared-modes", "subset-declared", "not-audited"]),
    streaming: z.enum(["source-driven", "native-owned", "not-audited"]),
    childObjects: z.enum(["none-observed", "native-owned", "not-audited"]),
    saveBehavior: z.enum(["not-persistent", "native-owned", "not-audited"]),
    runtimeVerification: z.enum(["not-verified", "constructor-probe", "real-level-probe"]),
    auditBasis: z.string().min(1),
  }),
});

export type NativeSpawn = z.infer<typeof NativeSpawnSchema>;
export type NativeSpawnAudit = NativeSpawn["audit"];

const nativeOnlyAudit: NativeSpawnAudit = {
  classification: "native-only",
  replacementSurface: "none",
  fallback: "skip-replacement",
  requiredCapabilities: ["nativeSpawn"],
  requiredAssets: ["native-registry"],
  lifecycle: "native-owned",
  modeAudit: "not-audited",
  streaming: "native-owned",
  childObjects: "not-audited",
  saveBehavior: "not-audited",
  runtimeVerification: "not-verified",
  auditBasis: "Native spawn is registered, but no source-backed replacement entry point is advertised.",
};

const constructorProbeAudit: NativeSpawnAudit = {
  ...nativeOnlyAudit,
  runtimeVerification: "constructor-probe",
  auditBasis: "The registered native constructor is exercised and deleted from a real adapter frame; gameplay ownership and replacement parity remain unverified.",
};

function describeParam(param: ParamDescription): { readonly description: string; readonly values?: readonly string[] } | undefined {
  if (param === "Unused") return undefined;
  if (param === "Unknown") return { description: "Game-specific parameter; behavior is not yet documented." };
  if (param.type === "Bit Flags") return { description: "Bit flags: " + param.flags.map((flag) => `${flag.index}=${flag.description}`).join(", ") };
  if (param.type === "TypeSelector") return { description: param.description, values: Object.entries(param.options).map(([value, label]) => `${value} (${label})`) };
  if (param.type === "Rotation") return { description: `${param.description} (${param.divisions} steps, ${param.multiplier}).` };
  return { description: param.description };
}

function nativeParams(params: ItemParams | undefined): NativeSpawn["params"] {
  if (params === undefined) return [];
  return [describeParam(params.p0), describeParam(params.p1), describeParam(params.p2), describeParam(params.p3)]
    .flatMap((description, index) => description === undefined ? [] : [{ name: `param${index}`, ...description, values: description.values === undefined ? undefined : [...description.values] }]);
}

function nativeTerrainItems(
  itemNames: Readonly<Record<number, string>>,
  firstItemId: number,
  itemParams?: Readonly<Record<number, ItemParams>>,
  replacementSurface: "terrain" | "map" = "terrain",
  auditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {},
  categoryOverrides: Readonly<Record<number, string>> = {},
): NativeSpawn[] {
  return Object.entries(itemNames)
    .map(([id, label]) => ({ id: Number(id), label }))
    .filter(({ id }) => Number.isInteger(id) && id >= firstItemId)
    .sort((left, right) => left.id - right.id)
    .map(({ id, label }) => ({
      id: String(id),
      label: `${id}: ${label}`,
      category: categoryOverrides[id] ?? "Terrain item",
      description: "Dispatches through the game's native item initializer. Availability and required assets depend on the current level.",
      params: nativeParams(itemParams?.[id]),
      audit: auditOverrides[id] ?? {
        classification: "replaceable-with-native-hooks",
        replacementSurface,
        fallback: "native-initializer",
        requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
        requiredAssets: ["level-assets"],
        lifecycle: "stateless",
        modeAudit: "all-declared-modes",
        streaming: "source-driven",
        childObjects: "not-audited",
        saveBehavior: "not-audited",
        runtimeVerification: "not-verified",
        auditBasis: replacementSurface === "map"
          ? "Validated against the adapter's map-item replacement entry point and native fallback path."
          : "Validated against the adapter's terrain-item replacement entry point and native fallback path.",
      } satisfies NativeSpawnAudit,
    }));
}

const billyTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  20: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["stampede-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c reserves item 20 for stampede kangaroo state but dispatches NilAdd; it has no terrain constructor to replace and remains native engine-owned." },
  22: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["stampede-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c reserves item 22 for the stampede camera but dispatches NilAdd; it has no terrain constructor to replace and remains native engine-owned." },
  23: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["stampede-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c reserves item 23 for the stampede walker but dispatches NilAdd; it has no terrain constructor to replace and remains native engine-owned." },
  34: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["stampede-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c reserves item 34 for stampede Kangarex state but dispatches NilAdd; it has no terrain constructor to replace and remains native engine-owned." },
  1: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["dueler-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 1 to Source/System/Areas/Duel.c:AddDueler; the constructor creates the dueler enemy and retains native duel state through the terrain item boundary." },
  4: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["plant-scenery-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 4 to Source/Items/Items.c:AddPlant; the constructor selects the plant model from terrain parameters and creates no persistent gameplay state." },
  21: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["boost-powerup-assets", "player-state", "terrain-systems"], lifecycle: "pickup", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 21 to Source/System/Areas/Stampede.c:AddBoost; the constructor registers the boost pickup and routes collection through native player boost state." },
  26: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["electric-fence-assets", "terrain-collision", "damage-systems"], lifecycle: "trigger", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 26 to the native electric-fence constructor; the hazard owns collision and damage state through the terrain item boundary." },
  32: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["free-life-pickup-assets", "player-state", "terrain-systems"], lifecycle: "pickup", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 32 to Source/Items/Items.c:AddFreeLifePOW; the constructor registers a free-life pickup and routes collection through native player life state." },
  36: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["peso-pickup-assets", "score-state", "terrain-systems"], lifecycle: "pickup", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 36 to the native peso constructor; the pickup mutates native score/currency state and remains owned by the terrain item lifecycle." },
};

const billyCallableTerrainAuditEntries: readonly (readonly [number, string, NativeSpawnAudit["lifecycle"], string])[] = [
  [2, "AddBuilding", "stateless", "Decoration"], [3, "AddHeadStone", "stateless", "Decoration"], [5, "AddDuelRockWall", "stateless", "Decoration"], [6, "AddCoffin", "stateless", "Decoration"],
  [7, "AddFrogMan_Shootout", "native-owned", "Enemy"], [8, "AddBandito_Shootout", "native-owned", "Enemy"], [9, "AddBarrel", "stateless", "Decoration"], [10, "AddWoodCrate", "stateless", "Decoration"],
  [11, "AddHayBale", "stateless", "Decoration"], [12, "AddShootoutSaloon", "stateless", "Decoration"], [13, "AddShootoutAlley", "stateless", "Decoration"], [14, "AddPost", "stateless", "Decoration"],
  [15, "AddFlame", "native-owned", "Hazard"], [16, "AddSmoker", "native-owned", "Hazard"], [17, "AddSceneryKangaCow", "native-owned", "Enemy"], [18, "AddTable", "stateless", "Decoration"],
  [19, "AddChair", "stateless", "Decoration"], [24, "AddDeadTree", "stateless", "Decoration"], [25, "AddRock", "stateless", "Decoration"], [27, "AddTumbleweed", "native-owned", "Hazard"],
  [28, "AddTremorGrave", "stateless", "Decoration"], [29, "AddTeePee", "stateless", "Decoration"], [30, "AddSwampCabin", "stateless", "Decoration"], [31, "AddTremorAlien_Shootout", "native-owned", "Enemy"],
  [33, "AddSpearSkull", "native-owned", "Hazard"], [35, "AddShorty_Shootout", "native-owned", "Enemy"],
];

const billyCallableTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  billyCallableTerrainAuditEntries.map(([nativeType, constructorName, lifecycle]) => [nativeType, {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["native-registry", "terrain-level-assets", "constructor-declared-dependencies"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: Source/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native terrain constructor remains the fallback ownership boundary, with level-specific assets and gameplay state requiring the current adapter context.`,
  } satisfies NativeSpawnAudit]),
);

const billyCompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...billyCallableTerrainAuditOverrides,
  ...billyTerrainAuditOverrides,
};

const billyTerrainCategoryOverrides: Readonly<Record<number, string>> = {
  1: "Enemy", 2: "Decoration", 3: "Decoration", 4: "Decoration", 5: "Decoration", 6: "Decoration", 7: "Enemy", 8: "Enemy", 9: "Decoration", 10: "Decoration", 11: "Decoration", 12: "Decoration", 13: "Decoration", 14: "Decoration", 15: "Hazard", 16: "Hazard", 17: "Enemy", 18: "Decoration", 19: "Decoration", 20: "Enemy", 21: "Pickup", 22: "System", 23: "Enemy", 24: "Decoration", 25: "Decoration", 26: "Hazard", 27: "Hazard", 28: "Decoration", 29: "Decoration", 30: "Decoration", 31: "Enemy", 32: "Pickup", 33: "Hazard", 34: "Enemy", 35: "Enemy", 36: "Pickup",
};

const nanosaurTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  2: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["triceratops-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 2 to src/Enemies/Enemy_TriCer.c:AddEnemy_Tricer; the constructor creates the native enemy and retains terrain ownership for streaming and collision." },
  4: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["lava-patch-assets", "terrain-collision", "damage-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 4 to src/Items/Items.c:AddLavaPatch; the constructor creates native lava collision/damage state and retains the terrain item boundary." },
  6: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["gas-vent-assets", "terrain-collision", "damage-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 6 to src/Items/Items.c:AddGasVent; the constructor owns the native vent effect and damage/collision state." },
  9: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["time-portal-assets", "level-transition-state", "terrain-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 9 to src/Items/TimePortal.c:AddTimePortal; the constructor creates the native portal and retains level-transition state." },
  10: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["tree-scenery-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 10 to src/Items/Items.c:AddTree; the constructor selects tree scenery and creates no persistent gameplay state." },
  17: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["step-stone-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 17 to src/Items/Triggers.c:AddStepStone; the constructor creates native stepping-stone geometry and collision without persistent item state." },
  1: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["powerup-assets", "terrain-player-systems"], lifecycle: "pickup", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 1 to src/Items/Triggers.c:AddPowerUp; the constructor creates the native powerup and routes collection through player state, while the existing production Nanosaur fixture exercises the registered powerup constructor." },
  3: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["rex-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 3 to src/Enemies/Enemy_Rex.c:AddEnemy_Rex; the constructor creates the native Rex enemy and retains terrain ownership for streaming and collision." },
  5: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["egg-pickup-assets", "inventory-systems", "terrain-systems"], lifecycle: "pickup", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 5 to src/Items/Pickups.c:AddEgg; the constructor creates the native egg pickup and routes recovery through inventory state, while the existing production Nanosaur fixture exercises the registered egg constructor." },
  7: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["pteranodon-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 7 to the native AddEnemy_Ptera constructor; the constructor creates the flying enemy and retains native population and terrain state." },
  8: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["stegosaurus-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 8 to the native AddEnemy_Stego constructor; the constructor creates the native enemy and retains terrain ownership for streaming and collision." },
  11: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["boulder-scenery-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 11 to src/Items/Items.c:AddBoulder; the constructor creates native boulder scenery and collision without persistent gameplay state." },
  12: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["mushroom-pickup-assets", "terrain-systems"], lifecycle: "pickup", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 12 to the native AddMushroom constructor; the constructor registers the native mushroom pickup and consumed-item state." },
  13: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["bush-scenery-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 13 to the native AddBush constructor; the constructor creates bush scenery without persistent gameplay state." },
  14: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["water-patch-assets", "terrain-collision", "water-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 14 to the native AddWaterPatch constructor; the constructor owns water collision and terrain interaction state." },
  15: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["crystal-pickup-assets", "terrain-systems"], lifecycle: "pickup", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 15 to the native AddCrystal constructor; the constructor registers consumed crystal state, while the existing production Nanosaur fixture exercises the registered crystal constructor." },
  16: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["spitter-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 16 to the native AddEnemy_Spitter constructor; the constructor creates the native enemy and retains combat/terrain ownership." },
  18: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["rolling-boulder-assets", "terrain-collision", "hazard-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 18 to the native AddRollingBoulder constructor; the constructor owns the moving boulder hazard and collision state." },
  19: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["spore-pod-assets", "terrain-collision", "hazard-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 19 to the native AddSporePod constructor; the constructor owns the native spore hazard and terrain collision state." },
};

const nanosaurTerrainCategoryOverrides: Readonly<Record<number, string>> = {
  1: "Pickup", 2: "Enemy", 3: "Enemy", 4: "Hazard", 5: "Pickup", 6: "Hazard", 7: "Enemy", 8: "Enemy", 9: "Trigger", 10: "Decoration", 11: "Decoration", 12: "Pickup", 13: "Decoration", 14: "Hazard", 15: "Pickup", 16: "Enemy", 17: "Platform", 18: "Hazard", 19: "Hazard",
};

const ottoTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  35: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["spline-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 35 for the magnet monster spline path but dispatches NilAdd in the terrain table; terrain replacement is not a valid constructor boundary." },
  40: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["spline-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 40 for the moving-platform spline path but dispatches NilAdd in the terrain table; terrain replacement is not a valid constructor boundary." },
  41: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["boss-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 41 for the blob boss machine but dispatches NilAdd in the terrain table; terrain replacement is not a valid constructor boundary." },
  79: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["bumper-car-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 79 for the clown fish but dispatches NilAdd in the terrain table; terrain replacement is not a valid constructor boundary." },
  86: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["level-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 86 as an unknown native slot and dispatches NilAdd; terrain replacement is not a valid constructor boundary." },
  103: { classification: "native-only", replacementSurface: "none", fallback: "skip-replacement", requiredCapabilities: ["nativeSpawn"], requiredAssets: ["level-native-systems"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "native-owned", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c reserves item 103 for the rail gun and dispatches NilAdd; terrain replacement is not a valid constructor boundary." },
  1: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["basic-plant-assets", "terrain-collision"], lifecycle: "stateless", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 1 to src/Items/Items.c:AddBasicPlant; the constructor selects basic plant/tree scenery and creates no persistent gameplay state." },
  3: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["squooshy-enemy-assets", "enemy-systems", "terrain-collision"], lifecycle: "native-owned", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 3 to src/Enemies/FireIce/Enemy_Squooshy.c:AddEnemy_Squooshy; the constructor creates the native enemy and retains terrain ownership for streaming and combat state." },
  13: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["wooden-gate-assets", "terrain-collision", "trigger-systems"], lifecycle: "trigger", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 13 to src/Items/Triggers.c:AddWoodenGate; the constructor creates the native gate assembly and owns its collision/trigger state." },
  26: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["exit-rocket-assets", "level-transition-state", "terrain-systems"], lifecycle: "trigger", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 26 to src/Player/Player.c:AddExitRocket; the constructor creates the native exit objective and retains level-transition state." },
  27: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["checkpoint-assets", "checkpoint-state", "terrain-systems"], lifecycle: "trigger", modeAudit: "all-declared-modes", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 27 to src/Items/Triggers.c:AddCheckpoint; the constructor owns checkpoint state and its native child assembly, and the existing Otto Matic strict terrain fixture exercises the adjacent native constructor boundary." },
  36: { classification: "replaceable-with-native-hooks", replacementSurface: "terrain", fallback: "native-initializer", requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"], requiredAssets: ["falling-slime-platform-assets", "terrain-collision", "platform-state"], lifecycle: "native-owned", modeAudit: "subset-declared", streaming: "source-driven", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "not-verified", auditBasis: "Source audit: src/Terrain/Terrain2.c dispatches item 36 to src/Items/Triggers.c:AddFallingSlimePlatform; the constructor owns the platform assembly and native movement/collision state." },
};

const ottoEarlyTerrainEntries: readonly (readonly [number, string, string])[] = [
  [2, "AddSpacePodGenerator", "Trigger"], [4, "AddHuman", "NPC"], [5, "AddAtom", "Pickup"], [6, "AddPowerupPod", "Pickup"], [7, "AddEnemy_BrainAlien", "Enemy"], [8, "AddEnemy_Onion", "Enemy"], [9, "AddEnemy_Corn", "Enemy"], [10, "AddEnemy_Tomato", "Enemy"],
  [11, "AddBarn", "Decoration"], [12, "AddSilo", "Decoration"], [14, "AddPhonePole", "Decoration"], [15, "AddTractor", "Decoration"], [16, "AddSprout", "Decoration"], [17, "AddCornStalk", "Decoration"], [18, "AddBigLeafPlant", "Decoration"], [19, "AddMetalGate", "Trigger"],
  [20, "AddFencePost", "Decoration"], [21, "AddWindmill", "Decoration"], [22, "AddMetalTub", "Decoration"], [23, "AddOutHouse", "Decoration"], [24, "AddRock", "Decoration"], [25, "AddHay", "Decoration"], [28, "AddSlimePipe", "Hazard"], [29, "AddFallingCrystal", "Hazard"],
  [30, "AddEnemy_Blob", "Enemy"], [31, "AddBumperBubble", "Hazard"], [32, "AddBasicCrystal", "Pickup"], [33, "AddInertBubble", "Decoration"], [34, "AddSlimeTree", "Decoration"],
];

const ottoLateTerrainEntries: readonly (readonly [number, string, string])[] = [
  [37, "AddBubblePump", "Trigger"], [38, "AddSlimeMech", "Enemy"], [39, "AddSpinningPlatform", "Platform"], [42, "AddBlobBossTube", "Enemy"], [43, "AddScaffoldingPost", "Platform"], [44, "AddJungleGate", "Trigger"], [45, "AddCrunchDoor", "Trigger"], [46, "AddManhole", "Trigger"], [47, "AddCloudPlatform", "Platform"], [48, "AddCloudTunnel", "Platform"],
  [49, "AddEnemy_Flamester", "Enemy"], [50, "AddEnemy_GiantLizard", "Enemy"], [51, "AddEnemy_FlyTrap", "Enemy"], [52, "AddEnemy_Mantis", "Enemy"], [53, "AddTurtlePlatform", "Platform"], [54, "AddSmashable", "Hazard"], [55, "AddLeafPlatform", "Platform"], [56, "AddHelpBeacon", "Trigger"], [57, "AddTeleporter", "Trigger"], [58, "AddZipLinePost", "Platform"],
  [59, "AddEnemy_Mutant", "Enemy"], [60, "AddEnemy_MutantRobot", "Enemy"], [61, "AddHumanScientist", "NPC"], [62, "AddProximityMine", "Hazard"], [63, "AddLampPost", "Decoration"], [64, "AddDebrisGate", "Trigger"], [65, "AddGraveStone", "Decoration"], [66, "AddCrashedShip", "Decoration"], [67, "AddChainReactingMine", "Hazard"], [68, "AddRubble", "Decoration"],
  [69, "AddTeleporterMap", "Trigger"], [70, "AddGreenSteam", "Hazard"], [71, "AddTentacleGenerator", "Enemy"], [72, "AddPitcherPlantBoss", "Enemy"], [73, "AddPitcherPod", "Hazard"], [74, "AddTractorBeamPost", "Hazard"], [75, "AddCannon", "Hazard"], [76, "AddBumperCar", "Platform"], [77, "AddTireBumperStrip", "Hazard"], [78, "AddEnemy_Clown", "Enemy"],
  [80, "AddBumperCarPowerPost", "Trigger"], [81, "AddEnemy_StrongMan", "Enemy"], [82, "AddBumperCarGate", "Trigger"], [83, "AddRocketSled", "Platform"], [84, "AddTrapDoor", "Trigger"], [85, "AddZigZagSlats", "Platform"], [87, "AddLavaPillar", "Hazard"], [88, "AddVolcanoGeneratorZone", "Hazard"], [89, "AddJawsBot", "Enemy"], [90, "AddIceSaucer", "Enemy"],
  [91, "AddRunwayLights", "Decoration"], [92, "AddEnemy_IceCube", "Enemy"], [93, "AddHammerBot", "Enemy"], [94, "AddDrillBot", "Enemy"], [95, "AddSwingerBot", "Enemy"], [96, "AddLavaStone", "Hazard"], [97, "AddSnowball", "Hazard"], [98, "AddLavaPlatform", "Platform"], [99, "AddSmoker", "Hazard"], [100, "AddRadarDish", "Decoration"],
  [101, "AddPeopleHut", "Decoration"], [102, "AddBeemer", "Pickup"], [104, "AddTurret", "Enemy"], [105, "AddEnemy_BrainBoss", "Enemy"], [106, "AddBlobArrow", "Hazard"], [107, "AddNeuronStrand", "Hazard"], [108, "AddBrainPort", "Trigger"],
];

function createOttoTerrainAudit(nativeType: number, constructorName: string, category: string): NativeSpawnAudit {
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Trigger" || category === "Hazard" ? "trigger" : category === "Enemy" || category === "NPC" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-specific-assets", "terrain-collision", "native-game-systems"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: src/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native terrain constructor remains the fallback ownership boundary for level-specific assets and gameplay state.`,
  };
}

const ottoEarlyTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  ottoEarlyTerrainEntries.map(([nativeType, constructorName, category]) => [nativeType, createOttoTerrainAudit(nativeType, constructorName, category)]),
);

const ottoLateTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  ottoLateTerrainEntries.map(([nativeType, constructorName, category]) => [nativeType, createOttoTerrainAudit(nativeType, constructorName, category)]),
);

const ottoCompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...ottoEarlyTerrainAuditOverrides,
  ...ottoLateTerrainAuditOverrides,
  ...ottoTerrainAuditOverrides,
};

const ottoTerrainCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries([...ottoEarlyTerrainEntries, ...ottoLateTerrainEntries].map(([nativeType, , category]) => [nativeType, category])),
  1: "Decoration", 3: "Enemy", 13: "Trigger", 26: "Objective", 27: "Trigger", 35: "Enemy", 36: "Platform", 40: "Platform", 41: "System", 79: "Enemy", 86: "System", 103: "Hazard",
};

const mightyMikeMapTableEntries: readonly (readonly [number, string, string, boolean])[] = [
  [0, "Caveman", "Enemy", true], [1, "AppearZone", "Trigger", true], [2, "Store", "Decoration", true], [3, "Bunny", "Pickup", true], [4, "Triceratops", "Enemy", true], [5, "Turtle", "Enemy", true], [6, "ManEatingPlant", "Enemy", true], [7, "DinoEgg", "Pickup", true], [8, "BabyDino", "Enemy", true], [9, "Rex", "Enemy", true], [10, "ClownBalloon", "System", false], [11, "ClownCar", "Enemy", true], [12, "JackInTheBox", "Enemy", true], [13, "Clown", "Enemy", true], [14, "MagicHat", "Trigger", true], [15, "HealthPowerup", "Pickup", true], [16, "FlowerClown", "Enemy", true], [17, "Teleport", "Trigger", true], [18, "RaceCar", "Enemy", true], [19, "Key", "Pickup", true], [20, "ClownDoor", "Trigger", true], [21, "CandyMovingPlatform", "Platform", true], [22, "CandyDoor", "Trigger", true], [23, "Star", "Pickup", true], [24, "ChocolateBunny", "Enemy", true], [25, "GingerbreadMan", "Enemy", true], [26, "MintCandy", "Enemy", true], [27, "CherryBomb", "System", false], [28, "GumBear", "Enemy", true], [29, "PlayerStartCoords", "System", false], [30, "FinishLine", "Objective", true], [31, "JurassicDoor", "Trigger", true], [32, "Caramel", "Enemy", true], [33, "WeaponPowerup", "Pickup", true], [34, "MiscPowerup", "Pickup", true], [35, "GumBall", "Decoration", true], [36, "LemonDrop", "Enemy", true], [37, "Giant", "Enemy", true], [38, "Dragon", "Enemy", true], [39, "Witch", "Enemy", true], [40, "BigBadWolf", "Enemy", true], [41, "Soldier", "Enemy", true], [42, "Muffin", "Pickup", true], [43, "Spider", "Enemy", true], [44, "FairyDoor", "Trigger", true], [45, "Battery", "Pickup", true], [46, "PoisonApple", "Enemy", true], [47, "Slinky", "Enemy", true], [48, "EightBall", "Enemy", true], [49, "ShipPowerup", "Pickup", true], [50, "Robot", "Enemy", true], [51, "Doggy", "Enemy", true], [52, "BargainDoor", "Trigger", true], [53, "Top", "Enemy", true], [54, "Hydrant", "Hazard", true], [55, "KeyColor", "Pickup", true],
];

function createMightyMikeMapAudit(nativeType: number, itemName: string, category: string, replaceable: boolean): NativeSpawnAudit {
  if (!replaceable) {
    return {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["map-native-systems"],
      lifecycle: "native-owned",
      modeAudit: "all-declared-modes",
      streaming: "native-owned",
      childObjects: "native-owned",
      saveBehavior: "native-owned",
      runtimeVerification: "not-verified",
      auditBasis: `Source audit: Mighty Mike item type ${nativeType} (${itemName}) is a reserved/system map value with no ordinary map constructor replacement boundary; it remains native map-engine-owned.`,
    };
  }
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Trigger" || category === "Hazard" || category === "Objective" ? "trigger" : category === "Enemy" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "map",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["scene-map-assets", "map-collision", "native-object-manager"],
    lifecycle,
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: Mighty Mike map item type ${nativeType} (${itemName}) enters through the packed ObjectEntryType map list and MikeScript_TryReplaceMapItem; native object-manager ownership remains the fallback boundary for this map family.`,
  };
}

const mightyMikeMapAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  mightyMikeMapTableEntries.map(([nativeType, itemName, category, replaceable]) => [nativeType, createMightyMikeMapAudit(nativeType, itemName, category, replaceable)]),
);

const mightyMikeMapCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries(mightyMikeMapTableEntries.map(([nativeType, , category]) => [nativeType, category])),
};

const bugdomTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  3: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-assets", "enemy-skeleton-assets", "terrain-player-systems"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 3 to AddEnemy_BoxerFly; the enemy constructor owns its runtime object and attached combat state, while the terrain item pointer drives native streaming and save state. Its level-specific initializer is not valid in every declared Bugdom mode.",
  },
  4: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-assets", "terrain-collision"],
    lifecycle: "stateless",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 4 to Items/Items2.c:AddRock; the constructor selects level-specific rock models, places the object on terrain, and assigns static collision. No child object is created in the audited constructor; the terrain item pointer remains the native streaming/save ownership boundary.",
  },
  26: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["hive-level-assets", "terrain-collision"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 26 to Items/Triggers.c:AddHoneycombPlatform; the constructor is Hive-only, retains platform state on the native object, and selects static or animated movement from item parameters. No child object is created in the audited constructor.",
  },
  29: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["hive-level-assets", "detonator-state", "terrain-collision"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 29 to Items/Triggers.c:AddDetonator; the Hive-only constructor creates a solid detonator box and a separate triggerable plunger, stores its ID, and reads native blown state from the terrain item flags.",
  },
  39: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-assets", "exit-log-assets", "terrain-collision"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 39 to Items/Triggers2.c:AddExitLog; the constructor creates the exit-log collision geometry and native completion interaction, retaining the terrain item pointer for streaming and progression state.",
  },
  62: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["hive-level-assets", "terrain-collision"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Terrain/Terrain2.c dispatches item 62 to Items/Traps.c:AddFloorSpike; the Hive-only constructor owns the spike movement mode, damage, and collision bounds, with no child object created in the audited constructor.",
  },
};

const bugdomTerrainTableEntries: readonly (readonly [number, string, string, boolean])[] = [
  [1, "AddLadyBugBonus", "Pickup", true], [2, "AddNut", "Pickup", true], [3, "AddEnemy_BoxerFly", "Enemy", true], [4, "AddRock", "Decoration", true], [5, "AddClover", "Pickup", true], [6, "AddGrass", "Decoration", true], [7, "AddWeed", "Decoration", true], [8, "NilAdd", "Enemy", false], [9, "AddEnemy_Ant", "Enemy", true], [10, "AddSunFlower", "Decoration", true],
  [11, "AddCosmo", "Decoration", true], [12, "AddPoppy", "Decoration", true], [13, "AddWallEnd", "Decoration", true], [14, "AddWaterPatch", "Hazard", true], [15, "AddEnemy_FireAnt", "Enemy", true], [16, "AddWaterBug", "Enemy", true], [17, "AddTree", "Decoration", true], [18, "AddDragonFly", "Enemy", true], [19, "AddCatTail", "Decoration", true], [20, "AddDuckWeed", "Decoration", true],
  [21, "AddLilyFlower", "Decoration", true], [22, "AddLilyPad", "Platform", true], [23, "AddPondGrass", "Decoration", true], [24, "AddReed", "Decoration", true], [25, "AddEnemy_PondFish", "Enemy", true], [26, "AddHoneycombPlatform", "Platform", true], [27, "AddHoneyPatch", "Pickup", true], [28, "AddFirecracker", "Hazard", true], [29, "AddDetonator", "Trigger", true], [30, "AddHiveDoor", "Trigger", true],
  [31, "AddEnemy_Mosquito", "Enemy", true], [32, "AddCheckpoint", "Trigger", true], [33, "AddLawnDoor", "Trigger", true], [34, "AddDock", "Decoration", true], [35, "NilAdd", "System", false], [36, "AddEnemy_Spider", "Enemy", true], [37, "NilAdd", "Enemy", false], [38, "AddFireFly", "Enemy", true], [39, "AddExitLog", "Objective", true], [40, "AddRootSwing", "Platform", true],
  [41, "AddThorn", "Hazard", true], [42, "NilAdd", "System", false], [43, "AddFireWall", "Hazard", true], [44, "AddWaterValve", "Trigger", true], [45, "AddHoneyTube", "Platform", true], [46, "AddEnemy_Larva", "Enemy", true], [47, "AddEnemy_FlyingBee", "Enemy", true], [48, "AddEnemy_WorkerBee", "Enemy", true], [49, "AddEnemy_QueenBee", "Enemy", true], [50, "AddRockLedge", "Platform", true],
  [51, "AddStump", "Decoration", true], [52, "AddRollingBoulder", "Hazard", true], [53, "AddEnemy_Roach", "Enemy", true], [54, "AddEnemy_Skippy", "Enemy", true], [55, "AddSlimePatch", "Hazard", true], [56, "AddLavaPatch", "Hazard", true], [57, "AddBentAntPipe", "Decoration", true], [58, "AddHorizAntPipe", "Decoration", true], [59, "AddEnemy_KingAnt", "Enemy", true], [60, "AddFaucet", "Trigger", true], [61, "AddWoodPost", "Decoration", true], [62, "AddFloorSpike", "Hazard", true], [63, "AddKingWaterPipe", "Trigger", true],
];

function createBugdomTerrainAudit(nativeType: number, constructorName: string, category: string, replaceable: boolean): NativeSpawnAudit {
  if (!replaceable) {
    return {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["level-native-systems"],
      lifecycle: "native-owned",
      modeAudit: "subset-declared",
      streaming: "native-owned",
      childObjects: "native-owned",
      saveBehavior: "native-owned",
      runtimeVerification: "not-verified",
      auditBasis: `Source audit: src/Terrain/Terrain2.c reserves item ${nativeType} for ${constructorName}; the slot has no callable terrain constructor and remains native level-engine-owned.`,
    };
  }
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Trigger" || category === "Hazard" || category === "Objective" ? "trigger" : category === "Enemy" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-specific-assets", "terrain-collision", "native-level-systems"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: src/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native level-terrain constructor remains the fallback ownership boundary for level-specific assets and gameplay state.`,
  };
}

const bugdomTableAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  bugdomTerrainTableEntries.map(([nativeType, constructorName, category, replaceable]) => [nativeType, createBugdomTerrainAudit(nativeType, constructorName, category, replaceable)]),
);

const bugdomCompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...bugdomTableAuditOverrides,
  ...bugdomTerrainAuditOverrides,
};

const bugdomTerrainCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries(bugdomTerrainTableEntries.map(([nativeType, , category]) => [nativeType, category])),
};

const bugdom2TerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  4: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-assets", "gnome-skeleton-assets", "enemy-systems"],
    lifecycle: "native-owned",
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 4 to Source/Enemies/Enemy_Gnome.c:AddEnemy_Gnome; the constructor enforces native enemy population limits, creates a skeleton enemy, and retains the terrain item pointer for streaming and native enemy state.",
  },
  5: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["foliage-assets", "terrain-collision"],
    lifecycle: "stateless",
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 5 to Source/Items/Items.c:AddDaisy; the constructor creates one waving foliage object with terrain tracking and collision, with no child object in the audited constructor.",
  },
  14: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-specific-platform-assets", "terrain-collision", "player-trigger-systems"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 14 to Source/Player/RideBall.c:AddRideBall; the constructor selects Playroom or Sidewalk assets from the native level, creates a triggerable player object, and attaches a native shadow child.",
  },
  42: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["mousetrap-skeleton-assets", "trap-trigger-systems", "pickup-assets"],
    lifecycle: "trigger",
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 42 to Source/Items/Traps.c:AddMouseTrap; the constructor creates the native trap and, when primed, chains a health pickup bait object and owns the trigger/kick callbacks.",
  },
  44: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["playroom-finish-line-assets", "terrain-systems"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 44 to Source/Items/SlotCar.c:AddFinishLine; the constructor uses the Playroom finish-line asset and retains the terrain item pointer, with no child object in the audited constructor.",
  },
  49: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["playroom-pickup-assets", "terrain-collision", "pickup-systems"],
    lifecycle: "pickup",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "constructor-probe",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 49 to Source/Items/Items2.c:AddDCell; the constructor creates a level-specific pickup, retains the terrain item pointer, and registers the native pickup boundary. The existing production Bugdom 2 constructor fixture exercises the registered D-Cell path; terrain replacement parity remains unverified.",
  },
};

const bugdom2TerrainTableEntries: readonly (readonly [number, string, string, boolean])[] = [
  [1, "AddSnail", "Decoration", true], [2, "AddSprinklerHead", "Decoration", true], [3, "AddButterfly", "Pickup", true], [4, "AddEnemy_Gnome", "Enemy", true], [5, "AddDaisy", "Decoration", true], [6, "AddGrass", "Decoration", true], [7, "AddSnailShell", "Decoration", true], [8, "AddTulip", "Decoration", true], [9, "AddAcorn", "Pickup", true], [10, "AddEnemy_HouseFly", "Enemy", true],
  [11, "AddScarecrow", "Decoration", true], [12, "AddEnemy_EvilPlant", "Enemy", true], [13, "AddDoor", "Trigger", true], [14, "AddRideBall", "Platform", true], [15, "AddBowlingMarble", "Decoration", true], [16, "AddBowlingPins", "Decoration", true], [17, "AddBrick", "Decoration", true], [18, "AddPost", "Decoration", true], [19, "AddChipmunk", "Enemy", true], [20, "AddShrubRoot", "Decoration", true],
  [21, "AddPebble", "Decoration", true], [22, "AddSnakeGenerator", "Enemy", true], [23, "AddPoolCoping", "Decoration", true], [24, "AddPoolLeaf", "Decoration", true], [25, "NilAdd", "System", false], [26, "AddSquishBerry", "Pickup", true], [27, "AddDogHouse", "Decoration", true], [28, "AddWindmill", "Decoration", true], [29, "AddRose", "Decoration", true], [30, "AddTulipPot", "Decoration", true],
  [31, "AddBeachBall", "Decoration", true], [32, "AddChlorineFloat", "Decoration", true], [33, "AddPoolRingFloat", "Decoration", true], [34, "AddDrainPipe", "Decoration", true], [35, "AddPOW", "Pickup", true], [36, "AddFirecracker", "Hazard", true], [37, "AddGlassBottle", "Decoration", true], [38, "AddEnemy_Flea", "Enemy", true], [39, "AddEnemy_Tick", "Enemy", true], [40, "NilAdd", "System", false],
  [41, "AddLetterBlock", "Decoration", true], [42, "AddMouseTrap", "Hazard", true], [43, "AddEnemy_ToySoldier", "Enemy", true], [44, "AddFinishLine", "Objective", true], [45, "AddEnemy_Otto", "Enemy", true], [46, "AddPuzzle", "Objective", true], [47, "AddLegoWall", "Decoration", true], [48, "AddFlashLight", "Pickup", true], [49, "AddDCell", "Pickup", true], [50, "AddCrayon", "Decoration", true],
  [51, "AddAntHill", "Hazard", true], [52, "AddEnemy_Dragonfly", "Enemy", true], [53, "AddCloud", "Platform", true], [54, "AddEnemy_Frog", "Enemy", true], [55, "AddCardboardBox", "Decoration", true], [56, "AddTrampoline", "Platform", true], [57, "AddMothBall", "Hazard", true], [58, "NilAdd", "System", false], [59, "AddClosetWall", "Decoration", true], [60, "AddEnemy_Moth", "Enemy", true],
  [61, "AddEnemy_ComputerBug", "Enemy", true], [62, "AddSiliconPart", "Pickup", true], [63, "NilAdd", "System", false], [64, "AddBookStack", "Decoration", true], [65, "AddEnemy_Roach", "Enemy", true], [66, "AddShoeBox", "Decoration", true], [67, "AddPictureFrame", "Decoration", true], [68, "AddEnemy_Ant", "Enemy", true], [69, "AddEnemy_PondFish", "Enemy", true], [70, "AddLilyPad", "Platform", true],
  [71, "AddCatTail", "Decoration", true], [72, "AddBubbler", "Hazard", true], [73, "AddPlatformFlower", "Platform", true], [74, "AddFishingLure", "Pickup", true], [75, "AddSilverware", "Decoration", true], [76, "AddPicnicBasket", "Decoration", true], [77, "AddKindling", "Hazard", true], [78, "AddBeeHive", "Hazard", true], [79, "AddSodaCan", "Decoration", true], [80, "AddVeggie", "Pickup", true], [81, "AddJar", "Decoration", true], [82, "AddTinCan", "Decoration", true], [83, "AddDetergent", "Hazard", true], [84, "AddBoxWall", "Decoration", true], [85, "AddGliderPart", "Pickup", true],
];

function createBugdom2TerrainAudit(nativeType: number, constructorName: string, category: string, replaceable: boolean): NativeSpawnAudit {
  if (!replaceable) {
    return {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["level-native-systems"],
      lifecycle: "native-owned",
      modeAudit: "subset-declared",
      streaming: "native-owned",
      childObjects: "native-owned",
      saveBehavior: "native-owned",
      runtimeVerification: "not-verified",
      auditBasis: `Source audit: Source/Terrain/Terrain2.c reserves item ${nativeType} for ${constructorName}; the slot has no callable terrain constructor and remains native level-engine-owned.`,
    };
  }
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Trigger" || category === "Hazard" || category === "Objective" ? "trigger" : category === "Enemy" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-specific-assets", "terrain-collision", "native-level-systems"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: Source/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native level-terrain constructor remains the fallback ownership boundary for level-specific assets and gameplay state.`,
  };
}

const bugdom2TableAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  bugdom2TerrainTableEntries.map(([nativeType, constructorName, category, replaceable]) => [nativeType, createBugdom2TerrainAudit(nativeType, constructorName, category, replaceable)]),
);

const bugdom2CompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...bugdom2TableAuditOverrides,
  ...bugdom2TerrainAuditOverrides,
};

const bugdom2TerrainCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries(bugdom2TerrainTableEntries.map(([nativeType, , category]) => [nativeType, category])),
};

const nanosaur2TerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  1: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["level-specific-tree-assets", "terrain-collision"],
    lifecycle: "stateless",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 1 to Source/Items/Trees.c:AddBirchTree; the constructor selects level-specific foliage, retains the terrain item pointer, and creates native trunk/canopy collision without a child object.",
  },
  15: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["raptor-skeleton-assets", "enemy-systems", "terrain-collision"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 15 to Source/Enemies/Enemy_Raptor.c:AddEnemy_Raptor; the constructor suppresses the enemy in kiddie mode, enforces native population limits, creates the skeleton enemy, and retains terrain ownership.",
  },
  17: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["air-mine-level-assets", "mine-chain-assets", "terrain-collision"],
    lifecycle: "native-owned",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 17 to Source/Items/Mines.c:AddAirMine; the constructor selects assets by native level and creates the mine base, mine, and chain as one native-owned assembly.",
  },
  18: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["forest-door-assets", "key-state", "terrain-collision"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 18 to Source/Items/ForestDoor.c:AddForestDoor; the constructor restricts supported level numbers, creates the native wall, door, and ring assembly, and retains key/door state in the native trigger system.",
  },
  21: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["health-pickup-assets", "pickup-effects", "terrain-collision"],
    lifecycle: "pickup",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 21 to Source/Items/POWs.c:AddHealthPOW; the constructor creates the health frame and membrane as a native pickup assembly, retains the terrain item pointer, and routes collection through native health state.",
  },
  46: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["hole-event-assets", "worm-assets", "terrain-systems"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 46 to Source/Items/Holes.c:AddHole; the constructor creates a native event object with terrain tracking and later owns worm spawning through its internal hole state.",
  },
};

const nanosaur2TerrainTableEntries: readonly (readonly [number, string, string, boolean])[] = [
  [1, "AddBirchTree", "Decoration", true], [2, "AddPineTree", "Decoration", true], [3, "AddEgg", "Pickup", true], [4, "AddEggWormhole", "Trigger", true], [5, "AddTowerTurret", "Enemy", true], [6, "AddWeaponPOW", "Pickup", true],
  [7, "AddSmallTree", "Decoration", true], [8, "AddFallenTree", "Decoration", true], [9, "AddTreeStump", "Decoration", true], [10, "AddGrass", "Decoration", true], [11, "AddFern", "Decoration", true], [12, "AddBerryBush", "Pickup", true],
  [13, "AddCatTail", "Decoration", true], [14, "AddRock", "Decoration", true], [15, "AddEnemy_Raptor", "Enemy", true], [16, "AddDustDevil", "Hazard", true], [17, "AddAirMine", "Hazard", true], [18, "AddForestDoor", "Trigger", true],
  [19, "AddForestDoorKey", "Pickup", true], [20, "AddElectrode", "Hazard", true], [21, "AddHealthPOW", "Pickup", true], [22, "AddFuelPOW", "Pickup", true], [23, "AddRiverRock", "Decoration", true], [24, "AddGasMound", "Hazard", true],
  [25, "AddBentPineTree", "Decoration", true], [26, "AddEnemy_Brach", "Enemy", true], [27, "AddDesertTree", "Decoration", true], [28, "AddDesertBush", "Decoration", true], [29, "AddCactus", "Hazard", true], [30, "AddCrystal", "Pickup", true],
  [31, "AddPalmTree", "Decoration", true], [32, "AddLaserOrb", "Hazard", true], [33, "AddShieldPOW", "Pickup", true], [34, "AddSmoker", "Hazard", true], [35, "AddFlame", "Hazard", true], [36, "AddPalmBush", "Decoration", true],
  [37, "AddBurntDesertTree", "Decoration", true], [38, "AddHydraTree", "Decoration", true], [39, "AddOddTree", "Decoration", true], [40, "AddGeckoPlant", "Decoration", true], [41, "AddSproutPlant", "Decoration", true], [42, "AddIvy", "Decoration", true],
  [43, "AddAsteroid", "Hazard", true], [44, "AddSwampFallenTree", "Decoration", true], [45, "AddSwampStump", "Decoration", true], [46, "AddHole", "Trigger", true], [47, "AddFreeLifePOW", "Pickup", true], [48, "NilAdd", "Enemy", false],
];

function createNanosaur2TerrainAudit(nativeType: number, constructorName: string, category: string, replaceable: boolean): NativeSpawnAudit {
  if (!replaceable) {
    return {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["mode-native-systems"],
      lifecycle: "native-owned",
      modeAudit: "subset-declared",
      streaming: "native-owned",
      childObjects: "native-owned",
      saveBehavior: "native-owned",
      runtimeVerification: "not-verified",
      auditBasis: `Source audit: Source/Terrain/Terrain2.c reserves item ${nativeType} for ${constructorName}; the slot has no callable terrain constructor and remains native mode-engine-owned.`,
    };
  }
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Trigger" || category === "Hazard" ? "trigger" : category === "Enemy" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["mode-level-assets", "terrain-collision", "native-mode-systems"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: Source/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native mode-terrain constructor remains the fallback ownership boundary for mode-specific assets and state.`,
  };
}

const nanosaur2TableAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  nanosaur2TerrainTableEntries.map(([nativeType, constructorName, category, replaceable]) => [nativeType, createNanosaur2TerrainAudit(nativeType, constructorName, category, replaceable)]),
);

const nanosaur2CompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...nanosaur2TableAuditOverrides,
  ...nanosaur2TerrainAuditOverrides,
};

const nanosaur2TerrainCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries(nanosaur2TerrainTableEntries.map(([nativeType, , category]) => [nativeType, category])),
};

const cromagTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  1: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["desert-cactus-assets", "terrain-collision", "trigger-systems"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 1 to Source/Items/Triggers.c:AddCactus; the constructor selects the cactus variant, optionally creates collision/trigger state from item parameters, and retains the terrain item pointer.",
  },
  5: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["race-powerup-assets", "player-inventory-state", "terrain-systems"],
    lifecycle: "pickup",
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 5 to Source/Items/Triggers.c:AddPOW; the constructor registers the native race pickup and routes collection through vehicle inventory state. The separately registered cromag.pow constructor probe does not claim this generic terrain replacement path.",
  },
  6: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["finish-line-assets", "race-state", "terrain-collision"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 6 to Source/Items/Items.c:AddFinishLine; the constructor selects track-specific finish geometry and collision while retaining native race completion state.",
  },
  17: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["campfire-track-assets", "terrain-collision", "trigger-systems"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "native-owned",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 17 to Source/Items/Triggers.c:AddCampFire; the constructor selects Ice or Scandinavia assets from the native track, creates trigger collision, and owns native smoke state.",
  },
  30: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["global-rock-assets", "terrain-collision"],
    lifecycle: "stateless",
    modeAudit: "all-declared-modes",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 30 to Source/Items/Items.c:AddRock; the constructor creates one global static rock with terrain tracking and collision and no child object.",
  },
  57: {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["atlantis-sea-mine-assets", "terrain-collision", "trigger-systems"],
    lifecycle: "trigger",
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: "none-observed",
    saveBehavior: "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: "Source audit: Source/Terrain/Terrain2.c dispatches item 57 to Source/Items/Triggers.c:AddSeaMine; the constructor creates a floating native trigger with collision and wobble state, retaining the terrain item pointer for streaming.",
  },
};

const cromagTerrainTableEntries: readonly (readonly [number, string, string, boolean])[] = [
  [1, "AddCactus", "Hazard", true], [2, "AddWaterPatch", "Hazard", true], [3, "AddSign", "Decoration", true], [4, "AddTree", "Decoration", true], [5, "AddPOW", "Pickup", true], [6, "AddFinishLine", "Objective", true],
  [7, "AddVase", "Decoration", true], [8, "AddRickshaw", "Decoration", true], [9, "AddFlagPole", "Decoration", true], [10, "AddWaterfall", "Decoration", true], [11, "AddToken", "Pickup", true], [12, "AddStickyTiresPOW", "Pickup", true],
  [13, "AddSuspensionPOW", "Pickup", true], [14, "AddEasterHead", "Decoration", true], [15, "AddDustDevil", "Hazard", true], [16, "AddSnoMan", "Decoration", true], [17, "AddCampFire", "Hazard", true], [18, "NilAdd", "System", false],
  [19, "AddLavaGenerator", "Hazard", true], [20, "AddPillar", "Decoration", true], [21, "AddPylon", "Decoration", true], [22, "AddBoat", "Decoration", true], [23, "NilAdd", "System", false], [24, "AddStatue", "Decoration", true],
  [25, "AddSphinx", "Decoration", true], [26, "AddTeamTorch", "Hazard", true], [27, "AddTeamBase", "Objective", true], [28, "AddBubbleGenerator", "Hazard", true], [29, "AddInvisibilityPOW", "Pickup", true], [30, "AddRock", "Decoration", true],
  [31, "AddBrontoNeck", "Decoration", true], [32, "AddRockOverhang", "Decoration", true], [33, "AddVine", "Decoration", true], [34, "AddAztecHead", "Decoration", true], [35, "NilAdd", "System", false], [36, "AddCastleTower", "Decoration", true],
  [37, "AddCatapult", "Hazard", true], [38, "AddGong", "Trigger", true], [39, "AddHouse", "Decoration", true], [40, "AddCauldron", "Hazard", true], [41, "AddWell", "Decoration", true], [42, "AddVolcano", "Hazard", true],
  [43, "AddClock", "Decoration", true], [44, "AddGoddess", "Objective", true], [45, "AddStoneHenge", "Decoration", true], [46, "AddColiseum", "Decoration", true], [47, "AddStump", "Decoration", true], [48, "AddBaracade", "Hazard", true],
  [49, "AddVikingFlag", "Decoration", true], [50, "AddTorchPot", "Hazard", true], [51, "AddCannon", "Hazard", true], [52, "AddClam", "Decoration", true], [53, "NilAdd", "System", false], [54, "NilAdd", "System", false],
  [55, "AddWeaponsRack", "Decoration", true], [56, "AddCapsule", "Pickup", true], [57, "AddSeaMine", "Hazard", true], [58, "NilAdd", "System", false], [59, "AddDragon", "Enemy", true], [60, "AddTarPatch", "Hazard", true],
  [61, "NilAdd", "System", false], [62, "AddTotemPole", "Decoration", true], [63, "AddDruid", "Enemy", true], [64, "NilAdd", "System", false], [65, "AddFlower", "Decoration", true], [66, "NilAdd", "System", false],
];

function createCromagTerrainAudit(nativeType: number, constructorName: string, category: string, replaceable: boolean): NativeSpawnAudit {
  if (!replaceable) {
    return {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["race-native-systems"],
      lifecycle: "native-owned",
      modeAudit: "subset-declared",
      streaming: "native-owned",
      childObjects: "native-owned",
      saveBehavior: "native-owned",
      runtimeVerification: "not-verified",
      auditBasis: `Source audit: Source/Terrain/Terrain2.c reserves item ${nativeType} for ${constructorName}; the slot has no callable terrain constructor and remains native race-engine-owned.`,
    };
  }
  const lifecycle: NativeSpawnAudit["lifecycle"] = category === "Pickup" ? "pickup" : category === "Objective" || category === "Trigger" || category === "Hazard" ? "trigger" : category === "Enemy" ? "native-owned" : "stateless";
  return {
    classification: "replaceable-with-native-hooks",
    replacementSurface: "terrain",
    fallback: "native-initializer",
    requiredCapabilities: ["scriptedSpawn", "objectMutation", "nativeSpawn"],
    requiredAssets: ["race-level-assets", "terrain-collision", "race-native-systems"],
    lifecycle,
    modeAudit: "subset-declared",
    streaming: "source-driven",
    childObjects: lifecycle === "stateless" ? "none-observed" : "native-owned",
    saveBehavior: lifecycle === "stateless" ? "not-persistent" : "native-owned",
    runtimeVerification: "not-verified",
    auditBasis: `Source audit: Source/Terrain/Terrain2.c dispatches item ${nativeType} to ${constructorName}; the callable native race-terrain constructor remains the fallback ownership boundary for track assets and race state.`,
  };
}

const cromagTableAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = Object.fromEntries(
  cromagTerrainTableEntries.map(([nativeType, constructorName, category, replaceable]) => [nativeType, createCromagTerrainAudit(nativeType, constructorName, category, replaceable)]),
);

const cromagCompleteTerrainAuditOverrides: Readonly<Record<number, NativeSpawnAudit>> = {
  ...cromagTableAuditOverrides,
  ...cromagTerrainAuditOverrides,
};

const cromagTerrainCategoryOverrides: Readonly<Record<number, string>> = {
  ...Object.fromEntries(cromagTerrainTableEntries.map(([nativeType, , category]) => [nativeType, category])),
};

export const GameSchema = z.object({
  gameId: z.string(),
  gameName: z.string(),
  supportedHooks: z.array(z.string()),
  contextFields: z.array(FieldSchema),
  nativeSpawns: z.array(NativeSpawnSchema),
});

export type Game = z.infer<typeof GameSchema>;

export const ApiSchema = z.object({
  hooks: z.array(HookSchema),
  apis: z.array(ApiFunctionSchema),
  games: z.array(GameSchema),
});

export type ApiSchemaType = z.infer<typeof ApiSchema>;

// The single source of truth for the scripting APIs
export const AUTHORITATIVE_API_SCHEMA: ApiSchemaType = ApiSchema.parse({
  hooks: [
    {
      name: "onGameStart",
      description: "Triggered when the game boots.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onGameShutdown",
      description: "Triggered once before the scripting runtime is destroyed.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelLoad",
      description: "Triggered when a level is being loaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelStart",
      description: "Triggered when gameplay starts in a level.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelComplete",
      description: "Triggered when a level is successfully completed.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLevelUnload",
      description: "Triggered when a level is unloaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onSave",
      description: "Triggered when the native game writes a save slot.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onLoad",
      description: "Triggered when the native game restores a save slot.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onFrame",
      description: "Triggered every frame.",
      contextType: "FrameContext",
      returnType: "nil",
    },
    {
      name: "onTerrainItem",
      description: "Triggered when a terrain item is spawned.",
      contextType: "TerrainItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onSplineItem",
      description: "Triggered when a spline item is spawned.",
      contextType: "SplineItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onMapItem",
      description: "Triggered when a map item is spawned.",
      contextType: "MikeMapItemContext",
      returnType: "ItemSpawnResult|nil",
    },
    {
      name: "onObjectFrame",
      description: "Triggered every frame for scripted objects. Mutate the object through pangea.object commands.",
      contextType: "ObjectFrameContext",
      returnType: "nil",
    },
    {
      name: "onPickupCollected",
      description: "Triggered when a registered pickup is collected.",
      contextType: "PickupContext",
      returnType: "PickupResult|nil",
    },
    {
      name: "onWeaponHit",
      description: "Triggered when a weapon or projectile hits a target.",
      contextType: "WeaponHitContext",
      returnType: "WeaponHitResult|nil",
    },
    {
      name: "onTriggerEnter",
      description: "Triggered when an object or player enters a scripted trigger.",
      contextType: "TriggerContext",
      returnType: "TriggerResult|nil",
    },
    {
      name: "onDamage",
      description: "Triggered before a supported adapter applies damage to a player.",
      contextType: "DamageContext",
      returnType: "DamageResult|nil",
    },
    {
      name: "onDamageApplied",
      description: "Triggered after a supported adapter applies damage to its player health state.",
      contextType: "DamageContext",
      returnType: "nil",
    },
    {
      name: "onDeath",
      description: "Triggered when a supported adapter player enters its death state.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onPlayerSpawn",
      description: "Triggered when a supported adapter first registers its player object.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onPlayerRespawn",
      description: "Triggered when a supported adapter restores its player at a checkpoint.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onCheckpointReached",
      description: "Triggered when a Cro-Mag Rally player crosses a race checkpoint.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onLapComplete",
      description: "Triggered when a Cro-Mag Rally or Nanosaur 2 player completes a validated lap.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onRaceFinish",
      description: "Triggered when a Cro-Mag Rally or Nanosaur 2 player completes a validated race; eventValue is the native placement.",
      contextType: "PlayerEventContext",
      returnType: "nil",
    },
    {
      name: "onObjectiveComplete",
      description: "Triggered when a Nanosaur 2 battle or capture-the-flag objective completes; eventValue is 0 for win, 1 for loss, or 2 for draw.",
      contextType: "ObjectiveEventContext",
      returnType: "nil",
    },
    {
      name: "onAreaLoad",
      description: "Triggered when an area is being loaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaStart",
      description: "Triggered when gameplay starts in an area.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaFrame",
      description: "Triggered every frame during an area.",
      contextType: "FrameContext",
      returnType: "nil",
    },
    {
      name: "onAreaComplete",
      description: "Triggered when an area is successfully completed.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onAreaUnload",
      description: "Triggered when an area is unloaded.",
      contextType: "LevelContext",
      returnType: "nil",
    },
    {
      name: "onRaceLoad",
      description: "Triggered when a race is being loaded.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceStart",
      description: "Triggered when a race starts.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceFrame",
      description: "Triggered every frame during a race.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceComplete",
      description: "Triggered when a race completes.",
      contextType: "RaceContext",
      returnType: "nil",
    },
    {
      name: "onRaceUnload",
      description: "Triggered when a race is unloaded.",
      contextType: "RaceContext",
      returnType: "nil",
    },
  ],
  apis: [
    {
      name: "pangea.log.info",
      description: "Logs an informational message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.log.warn",
      description: "Logs a warning message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.log.error",
      description: "Logs an error message.",
      parameters: [{ name: "message", type: "string" }],
      returnType: "nil",
    },
    {
      name: "pangea.level.current",
      description: "Returns the current active level number.",
      availabilityCapability: "levelMetadata",
      parameters: [],
      returnType: "number",
    },
    { name: "pangea.level.setting", description: "Reads a typed setting from the active level configuration.", availabilityCapability: "levelMetadata", parameters: [{ name: "key", type: "string" }], returnType: "string|number|boolean|nil" },
    { name: "pangea.api.capabilities", description: "Reports runtime features available for the selected game.", parameters: [], returnType: "PangeaCapabilities" },
    { name: "pangea.api.diagnostics", description: "Reports script memory, scheduler, subscription, frame, and deterministic command-stream diagnostics.", parameters: [], returnType: "PangeaDiagnostics" },
    { name: "pangea.api.requireVersion", description: "Fails script loading unless the runtime API is within the requested range.", parameters: [{ name: "minimum", type: "number" }, { name: "maximum", type: "number", optional: true }], returnType: "true" },
    { name: "pangea.time.frame", description: "Returns the current frame number.", parameters: [], returnType: "number" },
    { name: "pangea.time.delta", description: "Returns the current frame delta in seconds.", parameters: [], returnType: "number" },
    { name: "pangea.time.level", description: "Returns elapsed level time in seconds.", parameters: [], returnType: "number" },
    { name: "pangea.time.after", description: "Schedules a one-shot budgeted callback using level time.", parameters: [{ name: "delaySeconds", type: "number" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.time.every", description: "Schedules a drift-resistant repeating callback using level time.", parameters: [{ name: "intervalSeconds", type: "number" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.time.cancel", description: "Cancels a one-shot or repeating timer.", parameters: [{ name: "timerId", type: "number" }], returnType: "boolean" },
    { name: "pangea.time.isActive", description: "Checks whether a timer remains scheduled.", parameters: [{ name: "timerId", type: "number" }], returnType: "boolean" },
    { name: "pangea.task.start", description: "Starts a budgeted coroutine task immediately.", parameters: [{ name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.task.wait", description: "Suspends the current task for a level-time delay.", parameters: [{ name: "delaySeconds", type: "number" }], returnType: "nil" },
    { name: "pangea.task.cancel", description: "Cancels a suspended task.", parameters: [{ name: "taskId", type: "number" }], returnType: "boolean" },
    { name: "pangea.task.isActive", description: "Checks whether a task remains suspended or runnable.", parameters: [{ name: "taskId", type: "number" }], returnType: "boolean" },
    { name: "pangea.events.on", description: "Subscribes to a script-local event.", parameters: [{ name: "eventName", type: "string" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.events.once", description: "Subscribes for the next matching event emission only.", parameters: [{ name: "eventName", type: "string" }, { name: "callback", type: "function" }], returnType: "number" },
    { name: "pangea.events.off", description: "Removes an event subscription.", parameters: [{ name: "subscriptionId", type: "number" }], returnType: "boolean" },
    { name: "pangea.events.emit", description: "Synchronously emits an event with a read-only payload.", parameters: [{ name: "eventName", type: "string" }, { name: "payload", type: "unknown", optional: true }], returnType: "number" },
    { name: "pangea.random.number", description: "Returns a deterministic number from zero through one.", parameters: [], returnType: "number" },
    { name: "pangea.random.integer", description: "Returns a deterministic integer in an inclusive range.", parameters: [{ name: "minimum", type: "number" }, { name: "maximum", type: "number" }], returnType: "number" },
    { name: "pangea.random.seed", description: "Resets the deterministic random stream.", parameters: [{ name: "seed", type: "number" }], returnType: "nil" },
    { name: "pangea.persistence.get", description: "Reads a version-matched bounded persistent scalar, or nil when no value exists or the version does not match.", availabilityCapability: "persistence", parameters: [{ name: "key", type: "string" }, { name: "version", type: "number" }], returnType: "string|number|boolean|nil" },
    { name: "pangea.persistence.set", description: "Stores a versioned bounded persistent scalar in the runtime persistence backend.", availabilityCapability: "persistence", parameters: [{ name: "key", type: "string" }, { name: "version", type: "number" }, { name: "value", type: "unknown" }], returnType: "boolean" },
    { name: "pangea.persistence.delete", description: "Deletes a persistent value from the runtime persistence backend.", availabilityCapability: "persistence", parameters: [{ name: "key", type: "string" }], returnType: "boolean" },
    {
      name: "pangea.player.count",
      description: "Returns the number of active players exposed by the selected game.",
      availabilityCapability: "playerLookup",
      parameters: [],
      returnType: "number",
    },
    {
      name: "pangea.player.get",
      description: "Returns a normalized read-only player snapshot.",
      availabilityCapability: "playerLookup",
      parameters: [{ name: "playerNum", type: "number" }],
      returnType: "PangeaPlayerSnapshot|nil",
    },
    {
      name: "pangea.player.raceResults",
      description: "Returns the native read-only race result table, or nil when the selected game does not expose validated race state.",
      availabilityCapability: "raceMetadata",
      parameters: [],
      returnType: "PangeaRaceResult[]|nil",
    },
    {
      name: "pangea.player.objectiveResults",
      description: "Returns the bounded read-only objective result table observed from native objective completion events, or nil when no objective has completed.",
      availabilityCapability: "objectiveMetadata",
      parameters: [],
      returnType: "PangeaObjectiveResult[]|nil",
    },
    {
      name: "pangea.player.setHealth",
      description: "Sets a player's normalized health when the native adapter exposes a safe health mutation boundary.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "health", type: "number" }],
      returnType: "boolean",
      command: PLAYER_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setHealthResult",
      description: "Sets normalized player health and returns structured status and diagnostics.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "health", type: "number" }],
      returnType: "PlayerCommandResult",
      command: PLAYER_COMMAND_METADATA,
    },
    {
      name: "pangea.player.heal",
      description: "Adds normalized health to a player, clamped to full health, when the native adapter exposes safe health read and mutation boundaries.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "amount", type: "number" }],
      returnType: "boolean",
      command: PLAYER_HEAL_COMMAND_METADATA,
    },
    {
      name: "pangea.player.healResult",
      description: "Heals a player and returns structured status and diagnostics.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "amount", type: "number" }],
      returnType: "PlayerCommandResult",
      command: PLAYER_HEAL_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setInvulnerable",
      description: "Sets a player's native invulnerability timer in seconds; zero disables it.",
      availabilityCapability: "playerInvulnerability",
      parameters: [{ name: "playerNum", type: "number" }, { name: "durationSeconds", type: "number" }],
      returnType: "boolean",
      command: PLAYER_INVULNERABILITY_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setInvulnerableResult",
      description: "Sets player invulnerability and returns structured status and diagnostics.",
      availabilityCapability: "playerInvulnerability",
      parameters: [{ name: "playerNum", type: "number" }, { name: "durationSeconds", type: "number" }],
      returnType: "PlayerCommandResult",
      command: PLAYER_INVULNERABILITY_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setPosition",
      description: "Teleports a player when the native adapter exposes a safe position mutation boundary.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "position", type: "vector3" }],
      returnType: "boolean",
      command: PLAYER_POSITION_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setPositionResult",
      description: "Teleports a player and returns structured status and diagnostics.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "position", type: "vector3" }],
      returnType: "PlayerCommandResult",
      command: PLAYER_POSITION_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setVelocity",
      description: "Sets a player's velocity when the native adapter exposes a safe velocity mutation boundary.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "velocity", type: "vector3" }],
      returnType: "boolean",
      command: PLAYER_VELOCITY_COMMAND_METADATA,
    },
    {
      name: "pangea.player.setVelocityResult",
      description: "Sets a player's velocity and returns structured status and diagnostics.",
      availabilityCapability: "playerCommands",
      parameters: [{ name: "playerNum", type: "number" }, { name: "velocity", type: "vector3" }],
      returnType: "PlayerCommandResult",
      command: PLAYER_VELOCITY_COMMAND_METADATA,
    },
    {
      name: "pangea.spawn.native",
      description: "Spawns a native object.",
      completion: "native-spawn",
      availabilityCapability: "nativeSpawn",
      parameters: [
        { name: "id", type: "string" },
        { name: "position", type: "vector3" },
        { name: "options", type: "stringUnion", optional: true, unionValues: [] },
      ],
      returnType: "ObjectHandle|nil",
    },
    {
      name: "pangea.spawn.nativeResult",
      description: "Spawns a native object and returns structured status and diagnostics.",
      availabilityCapability: "nativeSpawn",
      parameters: [
        { name: "id", type: "unknown" },
        { name: "position", type: "vector3" },
        { name: "options", type: "table", optional: true },
      ],
      returnType: "NativeSpawnResult",
    },
    {
      name: "pangea.spawn.scripted",
      description: "Spawns a custom scripted object.",
      availabilityCapability: "scriptedSpawn",
      parameters: [
        { name: "id", type: "string" },
        { name: "position", type: "vector3" },
        { name: "options", type: "stringUnion", optional: true, unionValues: [] },
      ],
      returnType: "ObjectHandle|nil",
    },
    {
      name: "pangea.object.position",
      description: "Gets the position of an object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "Vector3|nil",
    },
    {
      name: "pangea.object.source",
      description: "Gets the validated terrain, spline, or map source record for a replacement object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "ObjectSource|nil",
    },
    { name: "pangea.object.all", description: "Returns all currently registered object handles.", parameters: [], returnType: "ObjectHandle[]" },
    { name: "pangea.object.findByTag", description: "Returns registered object handles carrying a tag.", parameters: [{ name: "tag", type: "string" }], returnType: "ObjectHandle[]" },
    { name: "pangea.object.nearest", description: "Returns the nearest readable registered object, optionally filtered by tag.", parameters: [{ name: "origin", type: "vector3" }, { name: "tag", type: "string", optional: true }], returnType: "ObjectHandle|nil" },
    { name: "pangea.object.exists", description: "Checks whether a generation-checked object handle is live.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "boolean" },
    { name: "pangea.object.tags", description: "Returns the tags assigned to an object.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "string[]" },
    { name: "pangea.object.hasTag", description: "Checks whether an object has a tag.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "tag", type: "string" }], returnType: "boolean" },
    { name: "pangea.object.state", description: "Returns mutable script-owned state scoped to an object generation.", parameters: [{ name: "handle", type: "objectHandle" }], returnType: "table|nil" },
    {
      name: "pangea.object.setPosition",
      description: "Sets the position of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "position", type: "vector3" },
      ],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.position,
    },
    {
      name: "pangea.object.setPositionResult",
      description: "Sets an object's position and returns structured status and diagnostics.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "position", type: "vector3" },
      ],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.position,
    },
    {
      name: "pangea.object.setPositionOffset",
      description: "Sets the current frame's visual position offset for an object. Only valid during onObjectFrame.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "offset", type: "vector3" },
      ],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.positionOffset,
    },
    {
      name: "pangea.object.setPositionOffsetResult",
      description: "Sets the current frame's visual position offset and returns structured status and diagnostics.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "offset", type: "vector3" },
      ],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.positionOffset,
    },
    {
      name: "pangea.object.setVelocity",
      description: "Sets the velocity of an object.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "velocity", type: "vector3" },
      ],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.velocity,
    },
    {
      name: "pangea.object.setVelocityResult",
      description: "Sets an object's velocity and returns structured status and diagnostics.",
      parameters: [
        { name: "handle", type: "objectHandle" },
        { name: "velocity", type: "vector3" },
      ],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.velocity,
    },
    { name: "pangea.object.setRotation", description: "Sets an object's Euler rotation.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "rotation", type: "vector3" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.rotation },
    { name: "pangea.object.setRotationResult", description: "Sets an object's Euler rotation and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "rotation", type: "vector3" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.rotation },
    { name: "pangea.object.setScale", description: "Sets an object's uniform scale.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "scale", type: "number" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.scale },
    { name: "pangea.object.setScaleResult", description: "Sets an object's uniform scale and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "scale", type: "number" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.scale },
    { name: "pangea.object.setAnimation", description: "Sets an object's animation by name or numeric ID.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "animation", type: "unknown" }, { name: "speed", type: "number", optional: true }, { name: "blendSeconds", type: "number", optional: true }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.animation },
    { name: "pangea.object.setAnimationResult", description: "Sets an object's animation and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "animation", type: "unknown" }, { name: "speed", type: "number", optional: true }, { name: "blendSeconds", type: "number", optional: true }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.animation },
    { name: "pangea.object.setCollisionEnabled", description: "Enables or disables an object's native collision checks.", availabilityCapability: "objectCollision", parameters: [{ name: "handle", type: "objectHandle" }, { name: "enabled", type: "boolean" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.collision },
    { name: "pangea.object.setCollisionEnabledResult", description: "Enables or disables native collision checks and returns structured status and diagnostics.", availabilityCapability: "objectCollision", parameters: [{ name: "handle", type: "objectHandle" }, { name: "enabled", type: "boolean" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.collision },
    { name: "pangea.object.setActive", description: "Activates or deactivates an object through a validated enabled-state transition.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "active", type: "boolean" }], returnType: "boolean", command: OBJECT_COMMAND_METADATA.activation },
    { name: "pangea.object.setActiveResult", description: "Activates or deactivates an object and returns structured status and diagnostics.", parameters: [{ name: "handle", type: "objectHandle" }, { name: "active", type: "boolean" }], returnType: "ObjectCommandResult", command: OBJECT_COMMAND_METADATA.activation },
    {
      name: "pangea.object.delete",
      description: "Deletes an object.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "boolean",
      command: OBJECT_COMMAND_METADATA.delete,
    },
    {
      name: "pangea.object.deleteResult",
      description: "Deletes an object and returns structured status and diagnostics.",
      parameters: [{ name: "handle", type: "objectHandle" }],
      returnType: "ObjectCommandResult",
      command: OBJECT_COMMAND_METADATA.delete,
    },
  ],
  games: [
    {
      gameId: "OttoMatic-Android",
      gameName: "Otto Matic",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onFrame", "onLevelComplete", "onLevelUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onCheckpointReached", "onPlayerRespawn", "onDeath", "onSave", "onLoad"],
      contextFields: [
        { name: "playerMode", type: "string", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(ottoItemTypeNames, 1, ottoItemParams, "terrain", ottoCompleteTerrainAuditOverrides, ottoTerrainCategoryOverrides),
        { id: "ottomatic.human", nativeType: 4, label: "Human", category: "NPC", description: "Spawn a rescue human using the loaded level's human assets.", audit: { ...nativeOnlyAudit, requiredAssets: ["native-registry", "human-skeleton-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "not-persistent", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Human.c registers rescue humans with type-specific skeleton tags and can chain rescue ice to the human; the production Otto Matic launch now exercises the native constructor probe; the native save path persists player state rather than individual human objects; ScriptBindings.c records the remaining dependencies." } },
        { id: "ottomatic.powerupPod", nativeType: 6, label: "Powerup Pod", category: "Pickup", description: "Spawn an Otto Matic health or weapon powerup pod.", audit: { ...nativeOnlyAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "powerup-pod-assets", "effects-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Items/Powerups.c registers powerup pods and routes collection through OttoScript_OnPickupCollected; the production Otto Matic launch exercises the native constructor probe; collection uses transient particle effects and no persistent child object is observed, while the native save path does not persist individual pods; ScriptBindings.c records the asset and effects dependencies." } },
        { id: "ottomatic.checkpoint", nativeType: 27, label: "Checkpoint", category: "Trigger", description: "Spawn a level checkpoint trigger.", audit: { ...constructorProbeAudit, lifecycle: "trigger", requiredAssets: ["native-registry", "checkpoint-state", "terrain-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/Triggers.c owns checkpoint activation, stores checkpoint state, chains the checkpoint dish to its base, and dispatches OnCheckpointReached; ScriptBindings.c provides the registered constructor probe and checkpoint dependency." } },
        { id: "ottomatic.teleporter", nativeType: 57, label: "Teleporter", category: "Trigger", description: "Spawn a teleporter using the current level transition state.", audit: { ...nativeOnlyAudit, lifecycle: "trigger", requiredAssets: ["native-registry", "teleporter-state", "terrain-level-transition-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Items/Teleporter.c owns global destination/activation state, chains each teleporter console to its arch, and drives native player level transition; the production Otto Matic launch exercises the native constructor probe; no scripted replacement path is advertised." } },
      ],
    },
    {
      gameId: "Bugdom-android",
      gameName: "Bugdom",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onFrame", "onLevelComplete", "onLevelUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onPlayerSpawn", "onCheckpointReached", "onPlayerRespawn", "onDeath", "onSave", "onLoad"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(bugdomItemTypeNames, 1, bugdomItemParams, "terrain", bugdomCompleteTerrainAuditOverrides, bugdomTerrainCategoryOverrides),
        { id: "bugdom.nut", nativeType: 2, label: "Nut", category: "Pickup", description: "Spawn a health nut pickup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "nut-pickup-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Triggers.c registers a regenerating or persistent terrain nut, creates native contents on collection, and dispatches through the Bugdom pickup boundary; ScriptBindings.c records the terrain and player dependencies." } },
        { id: "bugdom.clover", nativeType: 5, label: "Clover", category: "Pickup", description: "Spawn a clover key pickup.", audit: { ...nativeOnlyAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "clover-pickup-assets", "terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Items.c registers the level-specific clover model as a native pickup object with no child object or scripted replacement entry point; the production Bugdom launch now exercises its native constructor probe; the native save path persists clover totals rather than the individual clover object." } },
        { id: "bugdom.checkpoint", nativeType: 32, label: "Checkpoint", category: "Trigger", description: "Spawn a Bugdom checkpoint trigger.", audit: { ...constructorProbeAudit, lifecycle: "trigger", requiredAssets: ["native-registry", "checkpoint-state", "terrain-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Triggers2.c stores checkpoint state, creates a droplet child chained to the straw, and dispatches checkpoint progression; ScriptBindings.c provides the constructor probe and trigger dependency." } },
      ],
    },
    {
      gameId: "Bugdom2-Android",
      gameName: "Bugdom 2",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onFrame", "onLevelComplete", "onLevelUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onDeath", "onPlayerSpawn", "onCheckpointReached", "onPlayerRespawn", "onSave", "onLoad"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(bugdom2ItemTypeNames, 1, bugdom2ItemParams, "terrain", bugdom2CompleteTerrainAuditOverrides, bugdom2TerrainCategoryOverrides),
        { id: "bugdom2.powerup", nativeType: 35, label: "Powerup", category: "Powerup", description: "Spawn a powerup; options.subtype selects the powerup kind.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "global-powerup-models", "terrain-collision"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/Powerups.c registers the object, routes collection through DoTrig_Powerup, supports native attachment/detachment through ChainHead, and uses the global powerup model and terrain collision systems; Source/Scripting/ScriptBindings.c provides the constructor probe." } },
        { id: "bugdom2.dcell", nativeType: 49, label: "D-Cell", category: "Pickup", description: "Spawn a D-Cell using the current level's pickup assets.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "level-specific-pickup-models", "terrain-collision"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", auditBasis: "Source audit: Items/Items2.c registers AddDCell as a level-specific static pickup with no child-object creation; the native save path does not persist individual D-Cell objects, while Source/Scripting/ScriptBindings.c constructs the same model and collision shape for the probe." } },
        { id: "bugdom2.gliderPart", nativeType: 85, label: "Glider Part", category: "Pickup", description: "Spawn a collectible glider part when its level assets are loaded.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "level-specific-glider-models", "terrain-collision"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/Items3.c registers glider parts as pickups, creates a chained rubber-band child for the fuselage, and retains global glider-part ownership; Source/Scripting/ScriptBindings.c preserves the native constructor path and registration." } },
      ],
    },
    {
      gameId: "Nanosaur-android",
      gameName: "Nanosaur",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onFrame", "onLevelComplete", "onLevelUnload", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath"],
      contextFields: [],
      nativeSpawns: [
        ...nativeTerrainItems(nanosaurItemTypeNames, 1, nanosaurItemParams, "terrain", nanosaurTerrainAuditOverrides, nanosaurTerrainCategoryOverrides),
        { id: "nanosaur.powerup", nativeType: 1, label: "Powerup", category: "Powerup", description: "Spawn a Nanosaur powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "powerup-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: the native powerup constructor and collection path dispatch the pickup hook while mutating native player state and native quantity/life state; ScriptBindings.c records the dependency." } },
        { id: "nanosaur.egg", nativeType: 5, label: "Egg", category: "Pickup", description: "Spawn a collectible dinosaur egg.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "egg-pickup-assets", "inventory-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Pickups.c registers the collectible, optionally creates its native nest, and routes recovery through native inventory state; ScriptBindings.c records the dependency." } },
        { id: "nanosaur.crystal", nativeType: 15, label: "Crystal", category: "Pickup", description: "Spawn a collectible crystal.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "crystal-pickup-assets", "terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: Triggers.c registers a native crystal with terrain tracking and consumed-item flags; ScriptBindings.c records the dependency." } },
      ],
    },
    {
      gameId: "Nanosaur2-Android",
      gameName: "Nanosaur 2",
      supportedHooks: ["onGameStart", "onGameShutdown", "onLevelLoad", "onLevelStart", "onFrame", "onLevelComplete", "onLevelUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onPlayerSpawn", "onCheckpointReached", "onLapComplete", "onRaceFinish", "onObjectiveComplete", "onPlayerRespawn", "onDeath", "onSave", "onLoad"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["adventure", "race", "battle", "capture"], optional: true },
        { name: "networked", type: "boolean", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(nanosaur2ItemTypeNames, 1, nanosaur2ItemParams, "terrain", nanosaur2CompleteTerrainAuditOverrides, nanosaur2TerrainCategoryOverrides),
        { id: "nanosaur2.egg", nativeType: 3, label: "Egg", category: "Pickup", description: "Spawn a Nanosaur 2 objective egg.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "egg-objective-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/Eggs.c registers eggs across the VS mode switch, chains the egg and light beam to the nest, persists collection through item flags, and routes collection through the native egg objective state; Source/Scripting/ScriptBindings.c records the same dependency in the native item table." } },
        { id: "nanosaur2.weaponPow", nativeType: 6, label: "Weapon Powerup", category: "Pickup", description: "Spawn a weapon powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "weapon-pickup-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/POWs.c registers weapon powerups for single- and multiplayer timing paths, chains the native membrane effect, applies quantity to native player weapon state, and routes collection through the shared pickup boundary; Source/Scripting/ScriptBindings.c records the constructor dependency." } },
        { id: "nanosaur2.healthPow", nativeType: 21, label: "Health Powerup", category: "Pickup", description: "Spawn a health powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "health-pickup-assets", "terrain-player-systems"], modeAudit: "all-declared-modes", childObjects: "native-owned", saveBehavior: "native-owned", auditBasis: "Source audit: Items/POWs.c registers health powerups across the shared VS mode paths, chains the native membrane effect, applies health to native player state, and routes collection through the shared pickup boundary; Source/Scripting/ScriptBindings.c records the constructor dependency." } },
      ],
    },
    {
      gameId: "CroMagRally-Android",
      gameName: "Cro-Mag Rally",
      supportedHooks: ["onGameStart", "onGameShutdown", "onRaceLoad", "onRaceStart", "onRaceFrame", "onRaceComplete", "onRaceUnload", "onTerrainItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onCheckpointReached", "onLapComplete", "onRaceFinish", "onDeath"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["local", "practice", "network"], optional: true },
        { name: "trackName", type: "string", optional: true },
        { name: "networked", type: "boolean", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(croMagItemTypeNames, 1, croMagItemParams, "terrain", cromagCompleteTerrainAuditOverrides, cromagTerrainCategoryOverrides),
        { id: "cromag.pow", nativeType: 5, label: "Powerup", category: "Pickup", description: "Spawn a general race powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "powerup-trigger-assets", "player-inventory-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", auditBasis: "Source audit: Items/Triggers.c registers the single native powerup object in the shared race item table and dispatches pickup collection while mutating native vehicle inventory; race save data does not persist individual track pickups; ScriptBindings.c records the dependency." } },
        { id: "cromag.token", nativeType: 11, label: "Token", category: "Pickup", description: "Spawn a scoring token.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "token-score-state", "infobar-terrain-systems"], modeAudit: "subset-declared", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: Items/Triggers.c explicitly instantiates tokens only for GAME_MODE_TOURNAMENT, registers a single native object, marks consumed terrain state, and dispatches pickup collection while mutating native scoring/infobar state; ScriptBindings.c records the dependency." } },
        { id: "cromag.stickyTiresPow", nativeType: 12, label: "Sticky Tires", category: "Pickup", description: "Spawn a sticky-tires vehicle powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "sticky-tire-assets", "vehicle-physics-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", auditBasis: "Source audit: Items/Triggers.c registers the single native sticky-tire pickup in the shared race item table and dispatches collection while mutating native vehicle physics state; race save data does not persist individual track pickups; ScriptBindings.c records the dependency." } },
        { id: "cromag.suspensionPow", nativeType: 13, label: "Suspension", category: "Pickup", description: "Spawn a suspension vehicle powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "suspension-assets", "vehicle-physics-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", auditBasis: "Source audit: Items/Triggers.c registers the single native suspension pickup in the shared race item table and dispatches collection while mutating native vehicle physics state; race save data does not persist individual track pickups; ScriptBindings.c records the dependency." } },
        { id: "cromag.invisibilityPow", nativeType: 29, label: "Invisibility", category: "Pickup", description: "Spawn an invisibility powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "invisibility-assets", "player-visibility-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "not-persistent", auditBasis: "Source audit: Items/Triggers.c registers the single native invisibility pickup in the shared race item table and dispatches collection while mutating native player visibility state; race save data does not persist individual track pickups; ScriptBindings.c records the dependency." } },
      ],
    },
    {
      gameId: "BillyFrontier-Android",
      gameName: "Billy Frontier",
      supportedHooks: ["onGameStart", "onGameShutdown", "onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onTerrainItem", "onSplineItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onDamage", "onDamageApplied", "onPlayerSpawn", "onDeath", "onSave", "onLoad"],
      contextFields: [
        { name: "mode", type: "stringUnion", unionValues: ["duel", "shootout", "stampede", "targetPractice"], optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(billyItemTypeNames, 1, billyItemParams, "terrain", billyCompleteTerrainAuditOverrides, billyTerrainCategoryOverrides),
        { id: "billy.peso", nativeType: 36, label: "Peso", category: "Pickup", description: "Spawn a peso score pickup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "peso-pickup-assets", "score-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: Items.c registers a single peso object, dispatches the pickup hook, and mutates native score/peso state; ScriptBindings.c records the dependency." } },
        { id: "billy.freeLifePow", nativeType: 32, label: "Free Life", category: "Pickup", description: "Spawn a free-life powerup.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "free-life-assets", "player-terrain-systems"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: Items.c registers a single free-life object, dispatches the pickup hook, and mutates native player-life state; ScriptBindings.c records the dependency." } },
        { id: "billy.boost", nativeType: 21, label: "Stampede Boost", category: "Pickup", description: "Spawn a speed boost for Stampede mode.", audit: { ...constructorProbeAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "stampede-boost-assets", "stampede-terrain-systems"], modeAudit: "subset-declared", childObjects: "none-observed", saveBehavior: "native-owned", auditBasis: "Source audit: Areas/Stampede.c registers a single boost object only in Stampede gameplay, dispatches the pickup hook, and mutates native Stampede speed state; ScriptBindings.c records the dependency." } },
      ],
    },
    {
      gameId: "MightyMike-Android",
      gameName: "Mighty Mike",
      supportedHooks: ["onGameStart", "onGameShutdown", "onAreaLoad", "onAreaStart", "onAreaFrame", "onAreaComplete", "onAreaUnload", "onMapItem", "onObjectFrame", "onPickupCollected", "onTriggerEnter", "onWeaponHit", "onDamage", "onDamageApplied", "onPlayerSpawn", "onPlayerRespawn", "onDeath", "onSave", "onLoad"],
      contextFields: [
        { name: "sceneName", type: "string", optional: true },
        { name: "areaName", type: "string", optional: true },
      ],
      nativeSpawns: [
        ...nativeTerrainItems(mightyMikeItemTypeNames, 0, undefined, "map", mightyMikeMapAuditOverrides, mightyMikeMapCategoryOverrides),
        { id: "mightymike.bunny", nativeType: 3, label: "Bunny", category: "Pickup", description: "Spawn a bunny objective pickup.", audit: { ...nativeOnlyAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "bunny-objective-state", "playfield-object-manager"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Misc/Bonus.c registers a single bunny object and the native playfield/object manager owns objective state; the production Mighty Mike launch now exercises its native constructor probe; no scripted replacement path is advertised." } },
        { id: "mightymike.healthPow", nativeType: 15, label: "Health Powerup", category: "Pickup", description: "Spawn a Mighty Mike health powerup.", audit: { ...nativeOnlyAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "health-pickup-assets", "player-object-manager"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Misc/Bonus.c registers a single health pickup object and the native object manager owns player health mutation; the production Mighty Mike launch now exercises its native constructor probe; no scripted replacement path is advertised." } },
        { id: "mightymike.key", nativeType: 19, label: "Key", category: "Pickup", description: "Spawn an inventory key pickup.", audit: { ...nativeOnlyAudit, lifecycle: "pickup", requiredAssets: ["native-registry", "key-pickup-assets", "inventory-object-manager"], modeAudit: "all-declared-modes", childObjects: "none-observed", saveBehavior: "native-owned", runtimeVerification: "constructor-probe", auditBasis: "Source audit: Misc/Bonus.c registers a single key pickup object and the native object manager owns inventory mutation; the production Mighty Mike launch now exercises its native constructor probe; no scripted replacement path is advertised." } },
      ],
    },
  ],
});
