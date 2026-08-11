import { atom } from "jotai";
import { err, ok, Result } from "neverthrow";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import { Game, type GlobalsInterface } from "@/data/globals/globals";
import type { PreviewVfsFile } from "@/editor/utils/gamePreviewRuntimeTypes";
import { validateScriptPackage } from "./scriptPackageValidator";

import {
  BUNDLED_RUNTIME_PATH,
  GENERATED_ENTRY_PATH,
  USER_BOOTSTRAP_PATH,
  runtimeLevelsSchema,
  scriptBindingsFileSchema,
  scriptBehaviorDefinitionSchema,
  scriptCustomObjectDefinitionSchema,
  scriptCustomObjectPlacementSchema,
  scriptGlobalAssignmentSchema,
  scriptLevelStateSchema,
  scriptMapItemBindingSchema,
  scriptParameterDefinitionSchema,
  scriptObjectsFileSchema,
  scriptParamsFileSchema,
  scriptPlacementsFileSchema,
  scriptProjectSchema,
  scriptSplineBindingSchema,
  scriptTagDefinitionSchema,
  scriptTerrainBindingSchema,
  scriptTerrainReplacementSchema,
} from "./scriptWorkspaceStateTypes";
import { getDefaultHoverBeaconVisual } from "./scriptDefaultCustomVisuals";
import { buildScriptTypePackageFiles } from "./scriptTypeDeclarations";
import type {
  ScriptBehaviorDefinition,
  ScriptAssetFile,
  ScriptCompiledFile,
  ScriptCustomObjectDefinition,
  ScriptCustomObjectPlacement,
  ScriptDiagnostic,
  ScriptGlobalAssignment,
  ScriptHookId,
  ScriptLevelState,
  ScriptMapItemBinding,
  ScriptMapItemSignature,
  ScriptParameterDefinition,
  ScriptSourceFile,
  ScriptSplineBinding,
  ScriptSplineBindingSignature,
  ScriptSplineReplacement,
  ScriptTagDefinition,
  ScriptTargetKind,
  ScriptTerrainBinding,
  ScriptTerrainBindingSignature,
  ScriptTerrainReplacement,
  ScriptWorkspaceContext,
  ScriptWorkspaceState,
} from "./scriptWorkspaceStateTypes";

function defaultLevelState(): ScriptLevelState {
  return {
    globalHooks: [],
    terrainBindings: [],
    splineBindings: [],
    mapItemBindings: [],
    customPlacements: [],
    terrainReplacements: [],
    splineReplacements: [],
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug.length > 0 ? slug : "script";
}

function buildAssignmentId(prefix: string, value: string): string {
  return `${prefix}-${slugify(value)}`;
}

function inferLanguage(_path: string): "lua" {
  return "lua";
}

function isLuaSourcePath(path: string): boolean {
  return path.endsWith(".lua");
}

function encodeJson(value: unknown): Uint8Array {
  return strToU8(`${JSON.stringify(value, null, 2)}\n`);
}

function encodeText(value: string): Uint8Array {
  return strToU8(value);
}

function toEditorRelativePath(path: string): string {
  return path.replace(/^Data\/Scripts\/src\//, "./");
}

function addStatusLog(
  state: ScriptWorkspaceState,
  message: string,
): ScriptWorkspaceState {
  return {
    ...state,
    statusLog: [...state.statusLog, message].slice(-20),
  };
}

function createSourceFile(
  path: string,
  content: string,
  role: ScriptSourceFile["role"],
  ownerId?: string,
): ScriptSourceFile {
  return {
    path,
    content,
    savedContent: content,
    language: inferLanguage(path),
    readOnly: role === "generated-entry",
    role,
    ownerId,
  };
}

function replaceToken(template: string, token: string, value: string): string {
  return template.split(token).join(value);
}

function buildTerrainPredicate(
  signature: ScriptTerrainBindingSignature,
): string {
  return [
    `ctx.itemType == ${String(signature.itemType)}`,
    `ctx.position.x == ${String(signature.position.x)}`,
    `ctx.position.y == ${String(signature.position.y)}`,
    `ctx.position.z == ${String(signature.position.z)}`,
    `ctx.flags == ${String(signature.flags)}`,
    `#ctx.params == ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index + 1)}] == ${String(param)}`,
    ),
  ].join(" and ");
}

function buildSplinePredicate(signature: ScriptSplineBindingSignature): string {
  return [
    `ctx.itemType == ${String(signature.itemType)}`,
    `ctx.splineNum == ${String(signature.splineNum)}`,
    `ctx.placement == ${String(signature.placement)}`,
    `#ctx.params == ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index + 1)}] == ${String(param)}`,
    ),
  ].join(" and ");
}

function buildMapPredicate(signature: ScriptMapItemSignature): string {
  const sceneCheck = signature.sceneName
    ? [`ctx.gameName == ctx.gameName`, `true`]
    : ["true"];
  return [
    `ctx.itemType == ${String(signature.itemType)}`,
    `ctx.position.x == ${String(signature.position.x)}`,
    `ctx.position.y == ${String(signature.position.y)}`,
    `#ctx.params == ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index + 1)}] == ${String(param)}`,
    ),
    ...sceneCheck,
  ].join(" and ");
}

function buildBaseRuntimeTemplate(): string {
  return [
    "local pangea = require('pangea')",
    "",
    "local module = {}",
    "",
    "function module.onLevelStart(ctx)",
    "  pangea.log.info('Scripts ready for level ' .. tostring(ctx.levelNum))",
    "end",
    "",
    "return module",
    "",
  ].join("\n");
}

function getAdventureHooks(): readonly ScriptHookId[] {
  return [
    "onLevelLoad",
    "onLevelStart",
    "onFrame",
    "onObjectFrame",
    "onLevelComplete",
    "onLevelUnload",
    "onTerrainItem",
    "onSplineItem",
    "onPickupCollected",
    "onWeaponHit",
    "onTriggerEnter",
  ];
}

function getNanosaurHooks(): readonly ScriptHookId[] {
  return [
    "onLevelLoad",
    "onLevelStart",
    "onFrame",
    "onObjectFrame",
    "onLevelComplete",
    "onLevelUnload",
    "onTerrainItem",
    "onPickupCollected",
    "onWeaponHit",
    "onTriggerEnter",
  ];
}

function getBillyFrontierHooks(): readonly ScriptHookId[] {
  return [
    "onAreaLoad",
    "onAreaStart",
    "onAreaFrame",
    "onObjectFrame",
    "onAreaComplete",
    "onAreaUnload",
    "onTerrainItem",
    "onSplineItem",
    "onPickupCollected",
    "onWeaponHit",
    "onTriggerEnter",
  ];
}

function getMightyMikeHooks(): readonly ScriptHookId[] {
  return [
    "onAreaLoad",
    "onAreaStart",
    "onAreaFrame",
    "onObjectFrame",
    "onMapItem",
    "onPickupCollected",
    "onWeaponHit",
    "onTriggerEnter",
    "onAreaComplete",
    "onAreaUnload",
  ];
}

function getRaceHooks(): readonly ScriptHookId[] {
  return [
    "onRaceLoad",
    "onRaceStart",
    "onRaceFrame",
    "onObjectFrame",
    "onRaceComplete",
    "onRaceUnload",
    "onTerrainItem",
    "onPickupCollected",
    "onWeaponHit",
    "onTriggerEnter",
  ];
}

function createTag(
  id: string,
  label: string,
  description: string,
  targetKinds: readonly ScriptTargetKind[],
  source: "game" | "behavior",
): ScriptTagDefinition {
  return { id, label, description, targetKinds, source };
}

function getGameTags(gameId: string): readonly ScriptTagDefinition[] {
  if (gameId === "OttoMatic-Android") {
    return [
      createTag("ottomatic.player", "Otto Player", "Otto robot player character.", ["global", "customObject"], "game"),
      createTag("ottomatic.human", "Otto Human", "Rescue humans.", ["global", "customObject"], "game"),
      createTag("ottomatic.human.farmer", "Farmer", "Farmer rescue targets.", ["global", "customObject"], "game"),
      createTag("ottomatic.human.beewoman", "Beewoman", "Beewoman rescue targets.", ["global", "customObject"], "game"),
      createTag("ottomatic.human.scientist", "Scientist", "Scientist rescue targets.", ["global", "customObject"], "game"),
      createTag("ottomatic.human.skirtlady", "Skirtlady", "Skirtlady rescue targets.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.brainalien", "Brain Alien", "Brain Alien enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.onion", "Onion Alien", "Onion Alien enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.corn", "Corn Alien", "Corn Alien enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.tomato", "Tomato Alien", "Tomato Alien enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.blob", "Blob", "Giant Blob enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.slimetree", "Slime Tree", "Slime Tree hazard.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.squooshy", "Squooshy", "Squooshy alien.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.flamester", "Flamester", "Fire planet Flamester.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.giantlizard", "Giant Lizard", "Giant Lizard monster.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.flytrap", "Fly Trap", "Fly Trap plant.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.mantis", "Mantis", "Giant Mantis enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.turtle", "Giant Turtle", "Turtle boss or enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.podworm", "Pod Worm", "Pod Worm alien.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.mutant", "Mutant", "Mutant humanoid.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.mutantrobot", "Mutant Robot", "Mutant Robot enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.pitcherplant", "Pitcher Plant", "Pitcher Plant boss.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.clown", "Clown", "Space Clown enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.clownfish", "Clown Fish", "Space Clown Fish.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.strongman", "Strongman", "Strongman clown enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.icecube", "Ice Cube", "Ice planet Ice Cube.", ["global", "customObject"], "game"),
      createTag("ottomatic.enemy.elitebrainalien", "Elite Brain Alien", "Elite Brain Alien enemy.", ["global", "customObject"], "game"),
      createTag("ottomatic.powerupPod", "Powerup Pod", "Otto health and weapon pods.", ["global", "terrainItem"], "game"),
      createTag("ottomatic.checkpoint", "Level Checkpoint", "Otto checkpoints.", ["global", "terrainItem"], "game"),
      createTag("ottomatic.teleporter", "Teleporter Trigger", "Level exit/remap teleporter.", ["global", "terrainItem"], "game"),
    ];
  }

  if (gameId === "Bugdom-android") {
    return [
      createTag("bugdom.player", "Rollie McFly", "Rollie player character.", ["global", "customObject"], "game"),
      createTag("bugdom.clover", "Clover Key", "Clover keys/pickups.", ["global", "terrainItem"], "game"),
      createTag("bugdom.nut", "Nut Pickup", "Nut health/rescue pickup.", ["global", "terrainItem"], "game"),
      createTag("bugdom.checkpoint", "Checkpoint", "Level checkpoints.", ["global", "terrainItem"], "game"),
      createTag("bugdom.buddy.ladybug", "Ladybug Buddy", "Ladybugs in cages to rescue.", ["global", "customObject"], "game"),
      createTag("bugdom.buddy", "Rescue Buddy", "Helper bugs or friends.", ["global", "customObject"], "game"),
      createTag("bugdom.ride.waterbug", "Waterbug Ride", "Rideable waterbug.", ["global", "customObject"], "game"),
      createTag("bugdom.ride.dragonfly", "Dragonfly Ride", "Rideable dragonfly.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.ant", "Ant Soldier", "Ant soldier enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.spider", "Spider", "Spider enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.bee", "Flying Bee", "Flying bee enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.workerbee", "Worker Bee", "Worker bee enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.queenbee", "Queen Bee", "Queen Bee boss.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.kingant", "King Ant", "King Ant boss.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.fireant", "Fire Ant", "Fire ant enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.roach", "Roach", "Roach enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.mosquito", "Mosquito", "Mosquito enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.skippy", "Water Skipper", "Water skipper enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.larva", "Larva", "Larva enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.slug", "Slug", "Slug enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.fish", "Pond Fish", "Pond fish hazard/enemy.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.caterpillar", "Caterpillar", "Caterpillar enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.boxerfly", "Boxer Fly", "Boxer Fly enemies.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.bat", "Bat Enemy", "Bat hazard.", ["global", "customObject"], "game"),
      createTag("bugdom.enemy.foot", "Giant Foot", "Giant Foot hazard.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "Bugdom2-Android") {
    return [
      createTag("bugdom2.player", "Skip Player", "Skip grasshopper player.", ["global", "customObject"], "game"),
      createTag("bugdom2.collectible", "Collectible", "Collectible items (clovers, keys, batteries).", ["global"], "game"),
      createTag("bugdom2.dcell", "D-Cell Battery", "Energy battery pickups.", ["global", "terrainItem"], "game"),
      createTag("bugdom2.gliderPart", "Glider Part", "Level glider components.", ["global", "terrainItem"], "game"),
      createTag("bugdom2.powerup", "Powerup Pod", "Native Bugdom 2 pickups.", ["global", "terrainItem"], "game"),
      createTag("bugdom2.checkpoint", "Checkpoint", "Level checkpoints.", ["global", "customObject", "terrainItem"], "game"),
      createTag("bugdom2.hobobag", "Hobo Bag", "Hobo bag collectible.", ["global", "customObject"], "game"),
      createTag("bugdom2.acorn", "Acorn", "Acorn pickup item.", ["global", "terrainItem"], "game"),
      createTag("bugdom2.enemy.snail", "Snail Enemy", "Snail enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.gnome", "Gnome Enemy", "Gnome enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.housefly", "House Fly", "House Fly enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.evilplant", "Evil Plant", "Evil Plant hazard.", ["global", "customObject"], "game"),
      createTag("bugdom2.buddy.chipmunk", "Chipmunk Buddy", "Friendly chipmunk.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.snake", "Snake Enemy", "Snake enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.buddy.buddybug", "Buddy Bug", "Buddy Bug helper.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.flea", "Flea Enemy", "Flea enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.tick", "Tick Enemy", "Tick enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.mousetrap", "Mousetrap", "Mousetrap hazard.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.toysoldier", "Toy Soldier", "Toy Soldier enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.otto", "Otto Toy", "Toy Otto robot enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.bumblebee", "Bumblebee", "Bumblebee enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.ride.dragonfly", "Dragonfly Ride", "Dragonfly ride.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.frog", "Frog Enemy", "Frog enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.moth", "Moth Enemy", "Moth enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.computerbug", "Computer Bug", "Computer bug enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.roach", "Roach Enemy", "Roach enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.ant", "Ant Enemy", "Ant enemy.", ["global", "customObject"], "game"),
      createTag("bugdom2.enemy.fish", "Pond Fish", "Pond Fish enemy.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "CroMagRally-Android") {
    return [
      createTag("cromag.player", "Player Kart", "Racer player kart.", ["global", "customObject"], "game"),
      createTag("cromag.pow", "Powerup Item", "Weapon/powerup trigger items.", ["global", "terrainItem"], "game"),
      createTag("cromag.token", "Rally Token", "Scoring tokens.", ["global", "terrainItem"], "game"),
      createTag("cromag.enemy.yeti", "Yeti Racer", "Yeti racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.beetle", "Beetle Racer", "Beetle racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.camel", "Camel Racer", "Camel racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.catapult", "Catapult Racer", "Catapult racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.shark", "Shark Racer", "Shark racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.dragon", "Dragon Racer", "Dragon racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.mummy", "Mummy Racer", "Mummy racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.troll", "Troll Racer", "Troll racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.druid", "Druid Racer", "Druid racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.polarbear", "Polar Bear Racer", "Polar bear racer kart.", ["global", "customObject"], "game"),
      createTag("cromag.enemy.viking", "Viking Racer", "Viking racer kart.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "Nanosaur-android") {
    return [
      createTag("nanosaur.player", "Nanosaur Player", "Deinonychus player character.", ["global", "customObject"], "game"),
      createTag("nanosaur.egg", "Nanosaur Egg", "Dinosaur rescue egg.", ["global", "terrainItem"], "game"),
      createTag("nanosaur.crystal", "Energy Crystal", "Crystal pickups.", ["global", "terrainItem"], "game"),
      createTag("nanosaur.powerup", "Weapon Powerup", "Weapon or shield powerup.", ["global", "terrainItem"], "game"),
      createTag("nanosaur.enemy.pterodactyl", "Pterodactyl", "Pterodactyl enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur.enemy.trex", "T-Rex", "T-Rex boss.", ["global", "customObject"], "game"),
      createTag("nanosaur.enemy.stegosaurus", "Stegosaurus", "Stegosaurus enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur.enemy.raptor", "Raptor", "Raptor enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur.enemy.triceratops", "Triceratops", "Triceratops enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur.enemy.spitter", "Spitter Dilophosaurus", "Spitter enemy.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "Nanosaur2-Android") {
    return [
      createTag("nanosaur2.player", "Flying Player", "Pterodactyl player character.", ["global", "customObject"], "game"),
      createTag("nanosaur2.egg", "Nanosaur 2 Egg", "Eggs to capture/protect.", ["global", "terrainItem"], "game"),
      createTag("nanosaur2.weaponPow", "Weapon Powerup", "Laser/fire weapon powerups.", ["global", "terrainItem"], "game"),
      createTag("nanosaur2.healthPow", "Health Powerup", "Dinosaur health pickups.", ["global", "terrainItem"], "game"),
      createTag("nanosaur2.wormhole", "Wormhole", "Wormhole gate.", ["global", "customObject"], "game"),
      createTag("nanosaur2.bonuswormhole", "Bonus Wormhole", "Bonus wormhole gate.", ["global", "customObject"], "game"),
      createTag("nanosaur2.enemy.raptor", "Raptor Robot", "Raptor robot enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur2.enemy.brachiosaurus", "Brachiosaurus", "Brachiosaurus robot.", ["global", "customObject"], "game"),
      createTag("nanosaur2.enemy.worm", "Giant Worm", "Giant worm enemy.", ["global", "customObject"], "game"),
      createTag("nanosaur2.enemy.pterodactyl", "Enemy Pterodactyl", "Enemy pterodactyl robot.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "BillyFrontier-Android") {
    return [
      createTag("billy.player", "Billy Player", "Billy Frontier player.", ["global", "customObject"], "game"),
      createTag("billy.peso", "Peso Coins", "Peso score pickup.", ["global", "terrainItem"], "game"),
      createTag("billy.freeLifePow", "Free Life Powerup", "Extra life pickup.", ["global", "terrainItem"], "game"),
      createTag("billy.boost", "Stampede Boost", "Stampede speed boost.", ["global", "terrainItem"], "game"),
      createTag("billy.enemy.bandito", "Bandito Alien", "Bandito outlaw enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.rygar", "Rygar Beast", "Rygar beast enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.shorty", "Shorty Outlaw", "Shorty outlaw enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.kangacow", "Kanga Cow", "Stampede Kanga Cow.", ["global", "customObject"], "game"),
      createTag("billy.enemy.kangarex", "Kanga Rex", "Stampede Kanga Rex.", ["global", "customObject"], "game"),
      createTag("billy.enemy.walker", "Walker Robot", "Walker robot enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.tremoralien", "Tremor Alien", "Tremor Alien enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.tremorghost", "Tremor Ghost", "Tremor Ghost enemy.", ["global", "customObject"], "game"),
      createTag("billy.enemy.frogman", "Frogman Outlaw", "Frogman outlaw enemy.", ["global", "customObject"], "game"),
    ];
  }

  if (gameId === "MightyMike-Android") {
    return [
      createTag("mightymike.player", "Mike Player", "Mighty Mike player character.", ["global", "customObject"], "game"),
      createTag("mightymike.bunny", "Bunny Objective", "Bunny rescue target.", ["global", "customObject", "terrainItem"], "game"),
      createTag("mightymike.healthPow", "Health Powerup", "Mike health box.", ["global", "customObject", "terrainItem"], "game"),
      createTag("mightymike.key", "Level Key", "Key card box.", ["global", "customObject", "terrainItem"], "game"),
      createTag("mightymike.enemy.8ball", "8-Ball Toy", "8-Ball enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.battery", "Bad Battery", "Bad Battery enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.robot", "Robot Toy", "Robot Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.slinky", "Slinky Toy", "Slinky Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.top", "Spinning Top", "Spinning Top enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.doggy", "Doggy Toy", "Doggy Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.caramel", "Caramel Monster", "Caramel Monster enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.chocbunny", "Chocolate Bunny", "Chocolate Bunny enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.gingerbread", "Gingerbread Man", "Gingerbread Man enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.gummybear", "Gummy Bear", "Gummy Bear enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.lemondrop", "Lemon Drop", "Lemon Drop enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.mint", "Mint Enemy", "Mint enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.clown", "Clown Toy", "Clown Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.clowncar", "Clown Car", "Clown Car enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.flowerclown", "Flower Clown", "Flower Clown enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.magichat", "Magic Hat Bunny", "Magic Hat Bunny enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.bbwolf", "Big Bad Wolf", "Big Bad Wolf enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.dragon", "Dragon Toy", "Dragon Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.giant", "Giant Toy", "Giant Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.soldier", "Toy Soldier", "Toy Soldier enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.spider", "Toy Spider", "Toy Spider enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.witch", "Witch Toy", "Witch Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.babydino", "Baby Dino", "Baby Dino enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.caveman", "Caveman Toy", "Caveman Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.rex", "T-Rex Toy", "T-Rex Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.triceratops", "Triceratops Toy", "Triceratops Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.turtle", "Turtle Toy", "Turtle Toy enemy.", ["global", "customObject"], "game"),
      createTag("mightymike.enemy.dinoegg", "Dino Egg Toy", "Dino Egg Toy enemy.", ["global", "customObject"], "game"),
    ];
  }

  return [
    createTag(
      `${slugify(gameId)}.native`,
      "Native",
      "Native gameplay objects registered by the port.",
      ["global", "terrainItem", "splineItem", "mapItem"],
      "game",
    ),
  ];
}

function buildBehaviorCatalog(
  gameId: string,
): readonly ScriptBehaviorDefinition[] {
  const sharedBehaviors: readonly ScriptBehaviorDefinition[] = [
    {
      id: "sample.log-level-start",
      label: "Log Level Start",
      description: "Logs a message when the current level starts.",
      category: "Samples",
      targetKinds: ["global"],
      supportedHooks: ["onLevelStart", "onAreaStart", "onRaceStart"],
      sourceFilePath: "Data/Scripts/src/globals/log-level-start.lua",
      previewSupport: "preview-ready",
      defaultTags: [],
      contributedTags: [],
      template: [
        "local module = {}",
        "",
        "function module.__HOOK__(ctx)",
        '  pangea.log.info("LEVEL_EDITOR_SCRIPTING: start hook fired")',
        "end",
        "",
        "return module",
        "",
      ].join("\n"),
    },
    {
      id: "sample.item-trigger-logger",
      label: "Item Trigger Logger",
      description: "Logs when the selected native item spawns.",
      category: "Samples",
      targetKinds: ["terrainItem", "splineItem", "mapItem"],
      supportedHooks: ["onTerrainItem", "onSplineItem", "onMapItem"],
      sourceFilePath: "Data/Scripts/src/bindings/item-trigger.lua",
      previewSupport: "preview-ready",
      defaultTags: [],
      contributedTags: [],
      template: [
        "local module = {}",
        "",
        "local function matchesTarget(ctx)",
        "  return __PREDICATE__",
        "end",
        "",
        "function module.__HOOK__(ctx)",
        "  if not matchesTarget(ctx) then",
        "    return { handled = false }",
        "  end",
        '  pangea.log.info("LEVEL_EDITOR_SCRIPTING: matched native item binding")',
        "  return { handled = false }",
        "end",
        "",
        "return module",
        "",
      ].join("\n"),
    },
    {
      id: "sample.hover-beacon",
      label: "Hover Beacon",
      description: "A simple scripted object that bobs in place.",
      category: "Samples",
      targetKinds: ["customObject"],
      supportedHooks: ["onLevelStart"],
      sourceFilePath: "Data/Scripts/src/objects/hover-beacon.lua",
      previewSupport: "preview-ready",
      defaultTags: ["editor.custom.hoverBeacon"],
      contributedTags: [
        createTag(
          "editor.custom.hoverBeacon",
          "Hover Beacon",
          "Sample scripted object placed by the Scripts workspace.",
          ["customObject", "global"],
          "behavior",
        ),
      ],
      template: [
        "local hoverBeacon = {}",
        "local origins = {}",
        "",
        "function hoverBeacon.onUpdate(self, ctx)",
        "  local current = pangea.object.position(self.handle)",
        "  if not current then",
        "    return",
        "  end",
        "  local origin = origins[self.handle.id]",
        "  if not origin then",
        "    origin = current",
        "    origins[self.handle.id] = origin",
        "  end",
        "  local wave = math.sin(ctx.levelTimeSeconds * 4) * 16",
        "  pangea.object.setPosition(self.handle, {",
        "    x = origin.x,",
        "    y = origin.y + wave,",
        "    z = origin.z,",
        "  })",
        "end",
        "",
        "local module = {",
        "  sampleHoverbeacon = hoverBeacon,",
        "}",
        "return module",
        "",
      ].join("\n"),
    },
  ];

  if (gameId === "OttoMatic-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "otto.humans-jump",
        label: "Otto Humans Jump",
        description: "Applies a bobbing offset to Otto human rescue targets.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/otto-humans-jump.lua",
        previewSupport: "preview-ready",
        defaultTags: ["ottomatic.human"],
        contributedTags: [],
        template: [
          'local HUMAN_TAG = "ottomatic.human"',
          'local SCIENTIST_TAG = "ottomatic.human.scientist"',
          "",
          "local function hasTag(tags, tag)",
          "  for _, t in ipairs(tags) do",
          "    if t == tag then",
          "      return true",
          "    end",
          "  end",
          "  return false",
          "end",
          "",
          "local function getBobHeight(tags)",
          "  if hasTag(tags, SCIENTIST_TAG) then",
          "    return 56",
          "  else",
          "    return 32",
          "  end",
          "end",
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  if not hasTag(ctx.tags, HUMAN_TAG) then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 8) * getBobHeight(ctx.tags),",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "Bugdom-android") {
    return [
      ...sharedBehaviors,
      {
        id: "bugdom.bouncing-friends",
        label: "Bugdom Bouncing Friends",
        description: "Applies a bobbing offset to Bugdom ladybugs or helper buddies.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/bugdom-bouncing-friends.lua",
        previewSupport: "preview-ready",
        defaultTags: ["bugdom.buddy"],
        contributedTags: [],
        template: [
          'local BUDDY_TAG = "bugdom.buddy"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasBuddy = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == BUDDY_TAG then",
          "      hasBuddy = true",
          "      break",
          "    end",
          "  end",
          "  if not hasBuddy then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 6) * 20,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "Bugdom2-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "bugdom2.clover-bob",
        label: "Bugdom 2 Clover & Acorn Bob",
        description: "Applies a bobbing offset to Bugdom 2 collectibles (clovers, acorns, etc.).",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/bugdom2-clover-bob.lua",
        previewSupport: "preview-ready",
        defaultTags: ["bugdom2.collectible"],
        contributedTags: [],
        template: [
          '-- Targets all collectibles. Change to "bugdom2.acorn" to target only acorns,',
          '-- or "bugdom2.dcell" to target only batteries.',
          'local COLLECTIBLE_TAG = "bugdom2.collectible"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasCollectible = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == COLLECTIBLE_TAG then",
          "      hasCollectible = true",
          "      break",
          "    end",
          "  end",
          "  if not hasCollectible then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 5) * 15,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "CroMagRally-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "cromag.bouncing-pickups",
        label: "Cro-Mag Bouncing Pickups",
        description: "Bobs bone pick-ups or arrow elements in Cro-Mag Rally.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/cromag-bouncing-pickups.lua",
        previewSupport: "preview-ready",
        defaultTags: ["cromag.pickup"],
        contributedTags: [],
        template: [
          'local PICKUP_TAG = "cromag.pickup"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasPickup = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == PICKUP_TAG then",
          "      hasPickup = true",
          "      break",
          "    end",
          "  end",
          "  if not hasPickup then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 7) * 25,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "Nanosaur-android") {
    return [
      ...sharedBehaviors,
      {
        id: "nanosaur.hover-eggs",
        label: "Nanosaur Hover Eggs",
        description: "Causes Nanosaur eggs to bob/hover in place.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/nanosaur-hover-eggs.lua",
        previewSupport: "preview-ready",
        defaultTags: ["nanosaur.egg"],
        contributedTags: [],
        template: [
          'local EGG_TAG = "nanosaur.egg"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasEgg = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == EGG_TAG then",
          "      hasEgg = true",
          "      break",
          "    end",
          "  end",
          "  if not hasEgg then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 4) * 12,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "Nanosaur2-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "nanosaur2.powerup-spin",
        label: "Nanosaur 2 Powerup Spin",
        description: "Bobs or offsets powerups and egg nests in Nanosaur 2.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/nanosaur2-powerup-spin.lua",
        previewSupport: "preview-ready",
        defaultTags: ["nanosaur2.powerup"],
        contributedTags: [],
        template: [
          'local POWERUP_TAG = "nanosaur2.powerup"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasPowerup = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == POWERUP_TAG then",
          "      hasPowerup = true",
          "      break",
          "    end",
          "  end",
          "  if not hasPowerup then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 6) * 18,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "BillyFrontier-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "billy.cacti-bounce",
        label: "Billy Cacti Bounce",
        description: "Bobs cacti or target elements in Billy Frontier.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/billy-cacti-bounce.lua",
        previewSupport: "preview-ready",
        defaultTags: ["billy.cacti"],
        contributedTags: [],
        template: [
          'local CACTI_TAG = "billy.cacti"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasCacti = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == CACTI_TAG then",
          "      hasCacti = true",
          "      break",
          "    end",
          "  end",
          "  if not hasCacti then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 5) * 14,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  if (gameId === "MightyMike-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "mightymike.box-bob",
        label: "Mighty Mike Box Bob",
        description: "Bobs weapon/powerup boxes in Mighty Mike.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/mightymike-box-bob.lua",
        previewSupport: "preview-ready",
        defaultTags: ["mightymike.box"],
        contributedTags: [],
        template: [
          'local BOX_TAG = "mightymike.box"',
          "",
          "local module = {}",
          "",
          "function module.onObjectFrame(ctx)",
          "  local hasBox = false",
          "  for _, tag in ipairs(ctx.tags) do",
          "    if tag == BOX_TAG then",
          "      hasBox = true",
          "      break",
          "    end",
          "  end",
          "  if not hasBox then",
          "    return",
          "  end",
          "",
          "  return {",
          "    positionOffset = {",
          "      x = 0,",
          "      y = math.sin(ctx.levelTimeSeconds * 5) * 16,",
          "      z = 0,",
          "    },",
          "  }",
          "end",
          "",
          "return module",
          "",
        ].join("\n"),
      },
    ];
  }

  return sharedBehaviors;
}

export interface ScriptSampleDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly createState: (
    context: ScriptWorkspaceContext,
  ) => ScriptWorkspaceState;
}

function buildWorkspaceId(context: ScriptWorkspaceContext): string {
  return `${context.gameId}:${context.levelKey}`;
}

function levelLabelFromContext(context: ScriptWorkspaceContext): string {
  if (context.levelNumber === null) {
    return context.levelKey;
  }

  return `level-${String(context.levelNumber)}`;
}

function buildGeneratedEntryModule(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): string {
  const runtimeModules = state.moduleOrder.filter(
    (path) => path !== GENERATED_ENTRY_PATH,
  );
  const objectTypeBehaviors = state.behaviorCatalog.filter(
    (behavior) =>
      behavior.targetKinds.includes("objectType") &&
      behavior.objectType !== undefined &&
      runtimeModules.includes(behavior.sourceFilePath),
  );
  const objectTypeModulePaths = new Set(
    objectTypeBehaviors.map((behavior) => behavior.sourceFilePath),
  );
  const globalRuntimeModules = runtimeModules.filter(
    (path) => !objectTypeModulePaths.has(path),
  );
  const getModuleVariable = (path: string): string =>
    `__module_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`;

  const moduleRequires = runtimeModules
    .map(
      (path) =>
        `local ${getModuleVariable(path)} = require(${JSON.stringify(toEditorRelativePath(path))})`,
    )
    .join("\n");

  const moduleList = globalRuntimeModules
    .map(getModuleVariable)
    .join(", ");
  const objectTypes = [
    ...new Set(
      objectTypeBehaviors.flatMap((behavior) =>
        behavior.objectType === undefined ? [] : [behavior.objectType],
      ),
    ),
  ];
  const objectTypeRoutes = objectTypes
    .map((objectType) => {
      const modules = objectTypeBehaviors
        .filter((behavior) => behavior.objectType === objectType)
        .map((behavior) => getModuleVariable(behavior.sourceFilePath))
        .join(", ");
      return `  [${JSON.stringify(objectType)}] = { ${modules} },`;
    })
    .join("\n");

  const customObjectRequires: string[] = [];
  const customObjectExports: string[] = [];
  const customObjectFrameDispatch: string[] = [];
  state.customObjects.forEach((objectDefinition, index) => {
    const varName = `__customObjectModule${index}`;
    const relPath = toEditorRelativePath(objectDefinition.sourceFilePath);
    customObjectRequires.push(`local ${varName} = require(${JSON.stringify(relPath)})`);
    customObjectExports.push(
      `if type(${varName}) == "table" and ${varName}.${objectDefinition.exportName} ~= nil then`,
      `  entry.${objectDefinition.exportName} = ${varName}.${objectDefinition.exportName}`,
      `end`
    );
    customObjectFrameDispatch.push(
      `  if ctx.objectType == ${JSON.stringify(objectDefinition.id)} then`,
      `    local behavior = ${varName}.${objectDefinition.exportName}`,
      "    local handlerNames = { spawn = 'onSpawn', update = 'onUpdate', triggerEnter = 'onTriggerEnter', animationEvent = 'onAnimationEvent', animationComplete = 'onAnimationComplete', destroy = 'onDestroy' }",
      "    local handlerName = handlerNames[ctx.event or 'update']",
      "    local handler = type(behavior) == 'table' and behavior[handlerName] or nil",
      "    if type(handler) == 'function' then",
      "      handler({ handle = ctx.object }, ctx)",
      "    end",
      "  end",
    );
  });

  const placementBlocks = state.levels[context.levelKey]?.customPlacements ?? [];
  const hasPlacements = placementBlocks.length > 0;

  const preferredHook = context.supportedHooks.includes("onLevelStart")
    ? "onLevelStart"
    : context.supportedHooks.includes("onAreaStart")
      ? "onAreaStart"
      : "onRaceStart";

  const hookDispatchers = context.supportedHooks
    .map((hookId) => {
      const isStartHook = hookId === preferredHook;

      const dispatchBody: string[] = [];

      dispatchBody.push(
        "  for _, candidate in ipairs(__modules) do",
        `    local hook = candidate[${JSON.stringify(hookId)}]`,
        "    if type(hook) == 'function' then",
        "      hook(ctx)",
        "    end",
        "  end"
      );

      if (isStartHook && hasPlacements) {
        placementBlocks.forEach((placement) => {
          const objectDefinition = state.customObjects.find(
            (candidate) => candidate.id === placement.objectId,
          );
          if (objectDefinition) {
            dispatchBody.push(
              `  pangea.spawn.scripted(${JSON.stringify(placement.objectId)}, { x = ${placement.position.x}, y = ${placement.position.y}, z = ${placement.position.z} })`
            );
          }
        });
      }

      if (
        hookId === "onTerrainItem" ||
        hookId === "onSplineItem" ||
        hookId === "onMapItem"
      ) {
        return [
          `function entry.${hookId}(ctx)`,
          "  local markInUse = nil",
          "  for _, candidate in ipairs(__modules) do",
          `    local hook = candidate[${JSON.stringify(hookId)}]`,
          "    if type(hook) == 'function' then",
          "      local result = hook(ctx)",
          "      if result then",
          "        if result.markInUse ~= nil then",
          "          markInUse = result.markInUse",
          "        end",
          "        if result.handled then",
          "          return { handled = true, markInUse = markInUse }",
          "        end",
          "      end",
          "    end",
          "  end",
          "  return { handled = false, markInUse = markInUse }",
          "end",
        ].join("\n");
      }

      if (hookId === "onPickupCollected") {
        return [
          `function entry.${hookId}(ctx)`,
          "  local scoreDelta = 0",
          "  local healthDelta = 0",
          "  local consumePickup = nil",
          "  for _, candidate in ipairs(__modules) do",
          `    local hook = candidate[${JSON.stringify(hookId)}]`,
          "    if type(hook) == 'function' then",
          "      local result = hook(ctx)",
          "      if result then",
          "        if result.scoreDelta then",
          "          scoreDelta = scoreDelta + result.scoreDelta",
          "        end",
          "        if result.healthDelta then",
          "          healthDelta = healthDelta + result.healthDelta",
          "        end",
          "        if result.consumePickup ~= nil then",
          "          consumePickup = result.consumePickup",
          "        end",
          "        if result.handled then",
          "          return { handled = true, consumePickup = consumePickup, scoreDelta = scoreDelta, healthDelta = healthDelta }",
          "        end",
          "      end",
          "    end",
          "  end",
          "  return { handled = false, consumePickup = consumePickup, scoreDelta = scoreDelta, healthDelta = healthDelta }",
          "end",
        ].join("\n");
      }

      if (hookId === "onWeaponHit") {
        return [
          `function entry.${hookId}(ctx)`,
          "  local damage = ctx.damage",
          "  local scoreDelta = 0",
          "  local applyDamage = nil",
          "  local destroyTarget = nil",
          "  for _, candidate in ipairs(__modules) do",
          `    local hook = candidate[${JSON.stringify(hookId)}]`,
          "    if type(hook) == 'function' then",
          "      local result = hook(ctx)",
          "      if result then",
          "        if result.damage then",
          "          damage = result.damage",
          "        end",
          "        if result.scoreDelta then",
          "          scoreDelta = scoreDelta + result.scoreDelta",
          "        end",
          "        if result.applyDamage ~= nil then",
          "          applyDamage = result.applyDamage",
          "        end",
          "        if result.destroyTarget ~= nil then",
          "          destroyTarget = result.destroyTarget",
          "        end",
          "        if result.handled then",
          "          return { handled = true, applyDamage = applyDamage, damage = damage, destroyTarget = destroyTarget, scoreDelta = scoreDelta }",
          "        end",
          "      end",
          "    end",
          "  end",
          "  return { handled = false, applyDamage = applyDamage, damage = damage, destroyTarget = destroyTarget, scoreDelta = scoreDelta }",
          "end",
        ].join("\n");
      }

      if (hookId === "onTriggerEnter") {
        return [
          `function entry.${hookId}(ctx)`,
          "  local scoreDelta = 0",
          "  local healthDelta = 0",
          "  local damagePlayer = 0",
          "  local solid = nil",
          "  local deleteSelf = nil",
          "  local deleteOther = nil",
          "  for _, candidate in ipairs(__modules) do",
          `    local hook = candidate[${JSON.stringify(hookId)}]`,
          "    if type(hook) == 'function' then",
          "      local result = hook(ctx)",
          "      if result then",
          "        if result.scoreDelta then",
          "          scoreDelta = scoreDelta + result.scoreDelta",
          "        end",
          "        if result.healthDelta then",
          "          healthDelta = healthDelta + result.healthDelta",
          "        end",
          "        if result.damagePlayer then",
          "          damagePlayer = damagePlayer + result.damagePlayer",
          "        end",
          "        if result.solid ~= nil then",
          "          solid = result.solid",
          "        end",
          "        if result.deleteSelf ~= nil then",
          "          deleteSelf = result.deleteSelf",
          "        end",
          "        if result.deleteOther ~= nil then",
          "          deleteOther = result.deleteOther",
          "        end",
          "        if result.handled then",
          "          return { handled = true, solid = solid, deleteSelf = deleteSelf, deleteOther = deleteOther, damagePlayer = damagePlayer, healthDelta = healthDelta, scoreDelta = scoreDelta }",
          "        end",
          "      end",
          "    end",
          "  end",
          "  return { handled = false, solid = solid, deleteSelf = deleteSelf, deleteOther = deleteOther, damagePlayer = damagePlayer, healthDelta = healthDelta, scoreDelta = scoreDelta }",
          "end",
        ].join("\n");
      }

      if (hookId === "onObjectFrame") {
        return [
          `function entry.${hookId}(ctx)`,
          "  local objectResult = nil",
          ...customObjectFrameDispatch,
          "  local typedModules = __objectTypeModules[ctx.objectType]",
          "  if typedModules then",
          "    for _, typedModule in ipairs(typedModules) do",
          `      local typedHook = typedModule[${JSON.stringify(hookId)}]`,
          "      if type(typedHook) == 'function' then",
          "        local typedResult = typedHook(ctx)",
          "        if typedResult then",
          "          objectResult = typedResult",
          "        end",
          "      end",
          "    end",
          "  end",
          "  for _, candidate in ipairs(__modules) do",
          `    local hook = candidate[${JSON.stringify(hookId)}]`,
          "    if type(hook) == 'function' then",
          "      local result = hook(ctx)",
          "      if result then",
          "        objectResult = result",
          "      end",
          "    end",
          "  end",
          "  return objectResult",
          "end",
        ].join("\n");
      }

      return [
        `function entry.${hookId}(ctx)`,
        ...dispatchBody,
        "end",
      ].join("\n");
    })
    .join("\n\n");

  return [
    "local pangea = require('pangea')",
    "",
    moduleRequires,
    customObjectRequires.length > 0 ? "\n" + customObjectRequires.join("\n") : "",
    "",
    `local __modules = { ${moduleList} }`,
    "local __objectTypeModules = {",
    objectTypeRoutes,
    "}",
    "",
    "local entry = {}",
    "local function __hasTag(tags, expected)",
    "  for _, tag in ipairs(tags or {}) do",
    "    if tag == expected then",
    "      return true",
    "    end",
    "  end",
    "  return false",
    "end",
    "",
    customObjectExports.length > 0 ? customObjectExports.join("\n") + "\n" : "",
    hookDispatchers,
    "",
    "return entry",
    "",
  ].join("\n");
}

function getCompiledModulePath(sourcePath: string): string {
  const distPath = sourcePath.replace(
    "Data/Scripts/src/",
    "Data/Scripts/dist/modules/",
  );
  return distPath.endsWith(".lua") ? distPath : `${distPath}.lua`;
}

function compileModule(
  sourceFile: ScriptSourceFile,
): Result<
  {
    readonly output: string;
    readonly diagnostics: readonly ScriptDiagnostic[];
  },
  string
> {
  const diagnostics: ScriptDiagnostic[] = [];
  const output = sourceFile.content;
  return ok({ output, diagnostics });
}

function buildRequireDiagnostics(
  sourcePath: string,
  output: string,
): readonly ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  const requirePattern = /require\((['"][^'"]+['"])\)/g;

  for (const match of output.matchAll(requirePattern)) {
    const requireTarget = match[1]?.slice(1, -1);
    if (!requireTarget || requireTarget.startsWith("pangea")) {
      continue;
    }

    diagnostics.push({
      severity: "warning",
      message: `External require '${requireTarget}' may not resolve in preview runtime`,
      code: "preview.require",
      filePath: sourcePath,
      line: 1,
      column: 1,
    });
  }

  return diagnostics;
}

function cloneLevelMap(
  levels: Readonly<Record<string, ScriptLevelState>>,
): Record<string, z.infer<typeof scriptLevelStateSchema>> {
  return Object.fromEntries(
    Object.entries(levels).map(([key, value]) => [key, cloneLevelState(value)]),
  );
}

function cloneTagDefinition(
  tag: ScriptTagDefinition,
): z.infer<typeof scriptTagDefinitionSchema> {
  return {
    id: tag.id,
    label: tag.label,
    description: tag.description,
    targetKinds: [...tag.targetKinds],
    source: tag.source,
  };
}

function cloneBehaviorDefinition(
  behavior: ScriptBehaviorDefinition,
): z.infer<typeof scriptBehaviorDefinitionSchema> {
  return {
    id: behavior.id,
    label: behavior.label,
    description: behavior.description,
    category: behavior.category,
    targetKinds: [...behavior.targetKinds],
    supportedHooks: [...behavior.supportedHooks],
    sourceFilePath: behavior.sourceFilePath,
    objectType: behavior.objectType,
    previewSupport: behavior.previewSupport,
    defaultTags: [...behavior.defaultTags],
    contributedTags: behavior.contributedTags.map(cloneTagDefinition),
    template: behavior.template,
  };
}

function cloneGlobalAssignment(
  assignment: ScriptGlobalAssignment,
): z.infer<typeof scriptGlobalAssignmentSchema> {
  return {
    id: assignment.id,
    behaviorId: assignment.behaviorId,
    label: assignment.label,
    sourceFilePath: assignment.sourceFilePath,
    tags: [...assignment.tags],
    paramRefs: [...assignment.paramRefs],
    compatibility: assignment.compatibility,
    hookId: assignment.hookId,
  };
}

function cloneTerrainBinding(
  binding: ScriptTerrainBinding,
): z.infer<typeof scriptTerrainBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      position: { ...binding.signature.position },
      flags: binding.signature.flags,
      params: [...binding.signature.params],
    },
  };
}

function cloneSplineBinding(
  binding: ScriptSplineBinding,
): z.infer<typeof scriptSplineBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      splineNum: binding.signature.splineNum,
      placement: binding.signature.placement,
      params: [...binding.signature.params],
    },
  };
}

function cloneMapItemBinding(
  binding: ScriptMapItemBinding,
): z.infer<typeof scriptMapItemBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      position: { ...binding.signature.position },
      params: [...binding.signature.params],
      sceneName: binding.signature.sceneName,
    },
  };
}

function cloneCustomPlacement(
  placement: ScriptCustomObjectPlacement,
): z.infer<typeof scriptCustomObjectPlacementSchema> {
  return {
    id: placement.id,
    objectId: placement.objectId,
    label: placement.label,
    position: { ...placement.position },
    levelKey: placement.levelKey,
  };
}

function cloneLevelState(
  levelState: ScriptLevelState,
): z.infer<typeof scriptLevelStateSchema> {
  return {
    globalHooks: levelState.globalHooks.map(cloneGlobalAssignment),
    terrainBindings: levelState.terrainBindings.map(cloneTerrainBinding),
    splineBindings: levelState.splineBindings.map(cloneSplineBinding),
    mapItemBindings: levelState.mapItemBindings.map(cloneMapItemBinding),
    customPlacements: levelState.customPlacements.map(cloneCustomPlacement),
    terrainReplacements: levelState.terrainReplacements.map((replacement) => ({
      ...replacement,
    })),
    splineReplacements: levelState.splineReplacements.map((replacement) => ({
      ...replacement,
    })),
  };
}

function cloneCustomObjectDefinition(
  objectDefinition: ScriptCustomObjectDefinition,
): z.infer<typeof scriptCustomObjectDefinitionSchema> {
  return {
    id: objectDefinition.id,
    label: objectDefinition.label,
    sourceFilePath: objectDefinition.sourceFilePath,
    exportName: objectDefinition.exportName,
    tags: [...objectDefinition.tags],
    compatibility: objectDefinition.compatibility,
    description: objectDefinition.description,
    visual:
      objectDefinition.visual.kind === "customSkeleton"
        ? {
            ...objectDefinition.visual,
            animations: { ...objectDefinition.visual.animations },
          }
        : { ...objectDefinition.visual },
    collision: { ...objectDefinition.collision },
  };
}

function cloneParameterDefinition(
  param: ScriptParameterDefinition,
): z.infer<typeof scriptParameterDefinitionSchema> {
  return {
    id: param.id,
    label: param.label,
    type: param.type,
    description: param.description,
    defaultValue: param.defaultValue,
  };
}

function refreshGeneratedEntry(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  const sourceFiles: Record<string, ScriptSourceFile> = {
    ...state.sourceFiles,
  };
  sourceFiles[GENERATED_ENTRY_PATH] = createSourceFile(
    GENERATED_ENTRY_PATH,
    buildGeneratedEntryModule(state, context),
    "generated-entry",
  );

  const moduleOrder = state.moduleOrder.includes(GENERATED_ENTRY_PATH)
    ? state.moduleOrder
    : [GENERATED_ENTRY_PATH, ...state.moduleOrder];

  return {
    ...state,
    sourceFiles,
    moduleOrder,
  };
}

function createEmptyWorkspace(
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  const sourceFiles: Record<string, ScriptSourceFile> = {
    [USER_BOOTSTRAP_PATH]: createSourceFile(
      USER_BOOTSTRAP_PATH,
      buildBaseRuntimeTemplate(),
      "user",
    ),
  };

  const initialState: ScriptWorkspaceState = {
    projectVersion: 1,
    context,
    activeFilePath: USER_BOOTSTRAP_PATH,
    behaviorCatalog: buildBehaviorCatalog(context.gameId),
    moduleOrder: [USER_BOOTSTRAP_PATH],
    sourceFiles,
    compiledFiles: {},
    customObjects: [],
    params: [],
    assets: {},
    diagnostics: [],
    statusLog: ["Script workspace initialized"],
    sampleId: null,
    levels: {
      [context.levelKey]: defaultLevelState(),
    },
  };

  return refreshGeneratedEntry(initialState, context);
}

export function createScriptWorkspaceContext(
  globals: GlobalsInterface,
  levelNumber: number | null,
): ScriptWorkspaceContext {
  const gameId = (() => {
    switch (globals.GAME_TYPE) {
      case Game.OTTO_MATIC:
        return "OttoMatic-Android";
      case Game.BUGDOM:
        return "Bugdom-android";
      case Game.BUGDOM_2:
        return "Bugdom2-Android";
      case Game.NANOSAUR:
        return "Nanosaur-android";
      case Game.NANOSAUR_2:
        return "Nanosaur2-Android";
      case Game.CRO_MAG:
        return "CroMagRally-Android";
      case Game.BILLY_FRONTIER:
        return "BillyFrontier-Android";
      case Game.MIGHTY_MIKE:
        return "MightyMike-Android";
      default:
        return globals.GAME_NAME;
    }
  })();

  const supportedHooks =
    globals.GAME_TYPE === Game.MIGHTY_MIKE
      ? getMightyMikeHooks()
      : globals.GAME_TYPE === Game.CRO_MAG
        ? getRaceHooks()
        : gameId === "Nanosaur-android"
          ? getNanosaurHooks()
          : gameId === "BillyFrontier-Android"
            ? getBillyFrontierHooks()
            : getAdventureHooks();

  return {
    gameId,
    gameLabel: globals.GAME_NAME,
    levelNumber,
    levelKey: levelNumber === null ? "current" : String(levelNumber),
    supportedHooks,
    allowedTags: getGameTags(gameId),
  };
}

export function getScriptWorkspaceId(context: ScriptWorkspaceContext): string {
  return buildWorkspaceId(context);
}

export const scriptWorkspaceStoreAtom = atom<
  Readonly<Record<string, ScriptWorkspaceState>>
>({});

export function ensureScriptWorkspace(
  store: Readonly<Record<string, ScriptWorkspaceState>>,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  return store[buildWorkspaceId(context)] ?? createEmptyWorkspace(context);
}

export function replaceScriptWorkspace(
  store: Readonly<Record<string, ScriptWorkspaceState>>,
  state: ScriptWorkspaceState,
): Readonly<Record<string, ScriptWorkspaceState>> {
  return {
    ...store,
    [buildWorkspaceId(state.context)]: refreshGeneratedEntry(
      state,
      state.context,
    ),
  };
}

export function retargetScriptWorkspace(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  if (
    state.context.gameId === context.gameId &&
    state.context.levelKey === context.levelKey
  ) {
    return state;
  }

  const sourceLevel =
    state.levels[state.context.levelKey] ?? defaultLevelState();

  return {
    ...state,
    context,
    levels: state.levels[context.levelKey]
      ? state.levels
      : {
          ...state.levels,
          [context.levelKey]: sourceLevel,
        },
  };
}

function updateWorkspaceLevel(
  state: ScriptWorkspaceState,
  levelKey: string,
  updater: (levelState: ScriptLevelState) => ScriptLevelState,
): ScriptWorkspaceState {
  const currentLevel = state.levels[levelKey] ?? defaultLevelState();
  return {
    ...state,
    levels: {
      ...state.levels,
      [levelKey]: updater(currentLevel),
    },
  };
}

export function setScriptActiveFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  if (!state.sourceFiles[path] && !state.compiledFiles[path]) {
    return state;
  }

  return {
    ...state,
    activeFilePath: path,
  };
}

export function upsertScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
  content: string,
  role: ScriptSourceFile["role"] = "user",
  ownerId?: string,
): ScriptWorkspaceState {
  const nextFiles: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  const existing = nextFiles[path];
  nextFiles[path] = existing
    ? {
        ...existing,
        content,
        language: inferLanguage(path),
      }
    : createSourceFile(path, content, role, ownerId);

  const nextOrder = state.moduleOrder.includes(path)
    ? state.moduleOrder
    : [...state.moduleOrder, path];

  return refreshGeneratedEntry(
    {
      ...state,
      activeFilePath: path,
      sourceFiles: nextFiles,
      moduleOrder: nextOrder,
    },
    state.context,
  );
}

export function updateScriptSourceContent(
  state: ScriptWorkspaceState,
  path: string,
  content: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        content,
      },
    },
  };
}

export function saveScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        savedContent: sourceFile.content,
      },
    },
  };
}

export function revertScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        content: sourceFile.savedContent,
      },
    },
  };
}

export function removeScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  if (path === GENERATED_ENTRY_PATH || path === USER_BOOTSTRAP_PATH) {
    return state;
  }
  if (!state.sourceFiles[path]) {
    return state;
  }

  const nextFiles: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  delete nextFiles[path];

  return refreshGeneratedEntry(
    {
      ...state,
      activeFilePath:
        state.activeFilePath === path
          ? USER_BOOTSTRAP_PATH
          : state.activeFilePath,
      sourceFiles: nextFiles,
      moduleOrder: state.moduleOrder.filter((candidate) => candidate !== path),
    },
    state.context,
  );
}

function materializeBehaviorTemplate(
  behavior: ScriptBehaviorDefinition,
  replacements: Readonly<Record<string, string>>,
): string {
  let output = behavior.template;
  for (const [token, value] of Object.entries(replacements)) {
    output = replaceToken(output, token, value);
  }
  return output;
}

function getBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
): ScriptBehaviorDefinition | undefined {
  return state.behaviorCatalog.find((candidate) => candidate.id === behaviorId);
}

export function applyGlobalBehavior(
  state: ScriptWorkspaceState,
  hookId: ScriptHookId,
  behaviorId: string,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("global")) {
    return state;
  }

  const assignmentId = buildAssignmentId("global", `${hookId}-${behavior.id}`);
  const sourcePath = behavior.sourceFilePath;
  const hookName =
    hookId === "onAreaStart" || hookId === "onRaceStart" ? hookId : hookId;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    __HOOK__: hookName,
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      globalHooks: [
        ...levelState.globalHooks.filter(
          (candidate) => candidate.hookId !== hookId,
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label: behavior.label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          hookId,
        },
      ],
    })),
    state.context,
  );
}

export function removeGlobalBehavior(
  state: ScriptWorkspaceState,
  hookId: ScriptHookId,
): ScriptWorkspaceState {
  const levelState =
    state.levels[state.context.levelKey] ?? defaultLevelState();
  const existing = levelState.globalHooks.find(
    (candidate) => candidate.hookId === hookId,
  );
  const withoutHook = updateWorkspaceLevel(
    state,
    state.context.levelKey,
    (current) => ({
      ...current,
      globalHooks: current.globalHooks.filter(
        (candidate) => candidate.hookId !== hookId,
      ),
    }),
  );

  if (!existing) {
    return refreshGeneratedEntry(withoutHook, state.context);
  }

  return removeScriptSourceFile(withoutHook, existing.sourceFilePath);
}

export function applyTerrainBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptTerrainBindingSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("terrainItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "terrain",
    `${behavior.id}-${signature.itemType}-${signature.position.x}-${signature.position.z}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.lua`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    __HOOK__: "onTerrainItem",
    __CONTEXT_TYPE__: "TerrainItemContext",
    __PREDICATE__: buildTerrainPredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      terrainBindings: [
        ...levelState.terrainBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.position.x === signature.position.x &&
              candidate.signature.position.y === signature.position.y &&
              candidate.signature.position.z === signature.position.z
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "terrainItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function applySplineBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptSplineBindingSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("splineItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "spline",
    `${behavior.id}-${signature.itemType}-${signature.splineNum}-${signature.placement}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.lua`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    __HOOK__: "onSplineItem",
    __CONTEXT_TYPE__: "SplineItemContext",
    __PREDICATE__: buildSplinePredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      splineBindings: [
        ...levelState.splineBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.splineNum === signature.splineNum &&
              candidate.signature.placement === signature.placement
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "splineItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function applyMapItemBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptMapItemSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("mapItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "map-item",
    `${behavior.id}-${signature.itemType}-${signature.position.x}-${signature.position.y}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.lua`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    __HOOK__: "onMapItem",
    __CONTEXT_TYPE__: "MikeMapItemContext",
    __PREDICATE__: buildMapPredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      mapItemBindings: [
        ...levelState.mapItemBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.position.x === signature.position.x &&
              candidate.signature.position.y === signature.position.y
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "mapItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function removeBindingById(
  state: ScriptWorkspaceState,
  bindingId: string,
): ScriptWorkspaceState {
  const levelState =
    state.levels[state.context.levelKey] ?? defaultLevelState();
  const binding = [
    ...levelState.terrainBindings,
    ...levelState.splineBindings,
    ...levelState.mapItemBindings,
  ].find((candidate) => candidate.id === bindingId);

  const nextState = updateWorkspaceLevel(
    state,
    state.context.levelKey,
    (current) => ({
      ...current,
      terrainBindings: current.terrainBindings.filter(
        (candidate) => candidate.id !== bindingId,
      ),
      splineBindings: current.splineBindings.filter(
        (candidate) => candidate.id !== bindingId,
      ),
      mapItemBindings: current.mapItemBindings.filter(
        (candidate) => candidate.id !== bindingId,
      ),
    }),
  );

  if (!binding) {
    return refreshGeneratedEntry(nextState, state.context);
  }

  return removeScriptSourceFile(nextState, binding.sourceFilePath);
}

export function createCustomObjectFromBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  objectId: string,
  label: string,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("customObject")) {
    return state;
  }

  const exportName = slugify(objectId).replace(
    /-([a-z])/g,
    (_, letter: string) => letter.toUpperCase(),
  );
  const sourcePath = `Data/Scripts/src/objects/${slugify(objectId)}.lua`;
  const sourceContent = behavior.template;
  const existingObject = state.customObjects.find(
    (candidate) => candidate.id === objectId,
  );
  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    objectId,
  );
  const visual: ScriptCustomObjectDefinition["visual"] =
    behavior.id === "sample.hover-beacon"
      ? getDefaultHoverBeaconVisual(state.context.gameId)
      : { kind: "none" };
  const collision: ScriptCustomObjectDefinition["collision"] = {
    kind: "none",
  };

  return refreshGeneratedEntry(
    {
      ...nextState,
      customObjects: existingObject
        ? nextState.customObjects.map((candidate) =>
            candidate.id === objectId
              ? {
                  ...candidate,
                  label,
                  sourceFilePath: sourcePath,
                  exportName,
                  tags: [...behavior.defaultTags],
                  compatibility: behavior.previewSupport,
                  description: behavior.description,
                  visual,
                  collision,
                }
              : candidate,
          )
        : [
            ...nextState.customObjects,
            {
              id: objectId,
              label,
              sourceFilePath: sourcePath,
              exportName,
              tags: [...behavior.defaultTags],
              compatibility: behavior.previewSupport,
              description: behavior.description,
              visual,
              collision,
            },
          ],
    },
    state.context,
  );
}

export function updateCustomObjectDefinition(
  state: ScriptWorkspaceState,
  definition: ScriptCustomObjectDefinition,
): ScriptWorkspaceState {
  if (!state.customObjects.some((candidate) => candidate.id === definition.id)) {
    return state;
  }
  return refreshGeneratedEntry(
    {
      ...state,
      customObjects: state.customObjects.map((candidate) =>
        candidate.id === definition.id
          ? cloneCustomObjectDefinition(definition)
          : candidate,
      ),
    },
    state.context,
  );
}

export function replaceTerrainItemWithCustomObject(
  state: ScriptWorkspaceState,
  replacement: ScriptTerrainReplacement,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    terrainReplacements: [
      ...levelState.terrainReplacements.filter(
        (candidate) => candidate.itemIndex !== replacement.itemIndex,
      ),
      replacement,
    ],
  }));
}

export function removeTerrainItemReplacement(
  state: ScriptWorkspaceState,
  itemIndex: number,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    terrainReplacements: levelState.terrainReplacements.filter(
      (candidate) => candidate.itemIndex !== itemIndex,
    ),
  }));
}

export function replaceSplineItemWithCustomObject(
  state: ScriptWorkspaceState,
  replacement: ScriptSplineReplacement,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    splineReplacements: [
      ...levelState.splineReplacements.filter(
        (candidate) =>
          candidate.splineNum !== replacement.splineNum ||
          candidate.itemIndex !== replacement.itemIndex,
      ),
      replacement,
    ],
  }));
}

export function removeSplineItemReplacement(
  state: ScriptWorkspaceState,
  splineNum: number,
  itemIndex: number,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    splineReplacements: levelState.splineReplacements.filter(
      (candidate) =>
        candidate.splineNum !== splineNum || candidate.itemIndex !== itemIndex,
    ),
  }));
}

export function placeCustomObject(
  state: ScriptWorkspaceState,
  objectId: string,
  label: string,
  position: { readonly x: number; readonly y: number; readonly z: number },
): ScriptWorkspaceState {
  const placementId = buildAssignmentId(
    "placement",
    `${objectId}-${position.x}-${position.y}-${position.z}`,
  );
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: [
      ...levelState.customPlacements.filter(
        (candidate) => candidate.id !== placementId,
      ),
      {
        id: placementId,
        objectId,
        label,
        position,
        levelKey: state.context.levelKey,
      },
    ],
  }));
}

export function removeCustomPlacement(
  state: ScriptWorkspaceState,
  placementId: string,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: levelState.customPlacements.filter(
      (candidate) => candidate.id !== placementId,
    ),
  }));
}

export function moveCustomPlacement(
  state: ScriptWorkspaceState,
  placementId: string,
  position: { readonly x: number; readonly y: number; readonly z: number },
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: levelState.customPlacements.map((placement) =>
      placement.id === placementId ? { ...placement, position } : placement,
    ),
  }));
}

export function compileScriptWorkspace(
  state: ScriptWorkspaceState,
): Result<ScriptWorkspaceState, string> {
  const refreshed = refreshGeneratedEntry(state, state.context);
  const diagnostics: ScriptDiagnostic[] = [];
  const compiledFiles: Record<string, ScriptCompiledFile> = {};

  for (const sourceFile of Object.values(refreshed.sourceFiles)) {
    const compileResult = compileModule(sourceFile);
    if (compileResult.isErr()) {
      return err(compileResult.error);
    }

    diagnostics.push(...compileResult.value.diagnostics);
    diagnostics.push(
      ...buildRequireDiagnostics(sourceFile.path, compileResult.value.output),
    );
    const compiledPath = getCompiledModulePath(sourceFile.path);
    compiledFiles[compiledPath] = {
      path: compiledPath,
      content: compileResult.value.output,
      sourcePath: sourceFile.path,
    };
  }

  compiledFiles[BUNDLED_RUNTIME_PATH] = {
    path: BUNDLED_RUNTIME_PATH,
    content: refreshed.sourceFiles[GENERATED_ENTRY_PATH]?.content ?? "",
    sourcePath: GENERATED_ENTRY_PATH,
  };

  const updatedState = {
    ...refreshed,
    compiledFiles,
    diagnostics,
  };

  return ok(
    addStatusLog(
      updatedState,
      diagnostics.some((diagnostic) => diagnostic.severity === "error")
        ? "Compile completed with errors"
        : "Compile completed successfully",
    ),
  );
}

function buildRuntimeLevelsJson(
  state: ScriptWorkspaceState,
): z.infer<typeof runtimeLevelsSchema> {
  const context = state.context;
  if (context.levelNumber === null) {
    return {
      version: 1,
      levels: {},
    };
  }

  return {
    version: 1,
    levels: {
      [String(context.levelNumber)]: {
        script: BUNDLED_RUNTIME_PATH,
        extraNativeItems: [],
        itemOverrides: [],
        customObjects: state.customObjects.map(cloneCustomObjectDefinition),
        terrainReplacements: (
          state.levels[context.levelKey]?.terrainReplacements ?? []
        ).map((replacement) => ({ ...replacement })),
        splineReplacements: (
          state.levels[context.levelKey]?.splineReplacements ?? []
        ).map((replacement) => ({ ...replacement })),
        levelSettings: {},
      },
    },
  };
}

function buildProjectJson(
  state: ScriptWorkspaceState,
): z.infer<typeof scriptProjectSchema> {
  return {
    schemaVersion: 1,
    gameId: state.context.gameId,
    entryCompiledPath: BUNDLED_RUNTIME_PATH,
    editor: {
      activeFilePath: state.activeFilePath,
      moduleOrder: state.moduleOrder.filter(
        (path) => path !== GENERATED_ENTRY_PATH,
      ),
      behaviorCatalog: state.behaviorCatalog.map(cloneBehaviorDefinition),
      diagnostics: [...state.diagnostics],
      levels: cloneLevelMap(state.levels),
      sampleId: state.sampleId,
      statusLog: [...state.statusLog],
    },
  };
}

function buildBindingsJson(
  state: ScriptWorkspaceState,
  levelKey: string,
): z.infer<typeof scriptBindingsFileSchema> {
  const levelState = state.levels[levelKey] ?? defaultLevelState();
  return {
    schemaVersion: 1,
    terrainBindings: levelState.terrainBindings.map(cloneTerrainBinding),
    splineBindings: levelState.splineBindings.map(cloneSplineBinding),
    mapItemBindings: levelState.mapItemBindings.map(cloneMapItemBinding),
  };
}

function buildPlacementsJson(
  state: ScriptWorkspaceState,
  levelKey: string,
): z.infer<typeof scriptPlacementsFileSchema> {
  const levelState = state.levels[levelKey] ?? defaultLevelState();
  return {
    schemaVersion: 1,
    placements: levelState.customPlacements.map(cloneCustomPlacement),
  };
}

function buildObjectsJson(
  state: ScriptWorkspaceState,
): z.infer<typeof scriptObjectsFileSchema> {
  return {
    schemaVersion: 1,
    objects: state.customObjects.map(cloneCustomObjectDefinition),
  };
}

function buildParamsJson(
  state: ScriptWorkspaceState,
): z.infer<typeof scriptParamsFileSchema> {
  return {
    schemaVersion: 1,
    params: state.params.map(cloneParameterDefinition),
  };
}

export interface ScriptPackageFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export function buildScriptPackageFiles(
  state: ScriptWorkspaceState,
): Result<readonly ScriptPackageFile[], string> {
  const compiledState = compileScriptWorkspace(state);
  if (compiledState.isErr()) {
    return err(compiledState.error);
  }

  const compiled = compiledState.value;
  const files: ScriptPackageFile[] = [
    {
      path: "Data/Scripts/config/project.json",
      bytes: encodeJson(buildProjectJson(compiled)),
    },
    {
      path: "Data/Scripts/config/levels.json",
      bytes: encodeJson(buildRuntimeLevelsJson(compiled)),
    },
    {
      path: `Data/Scripts/config/bindings/${levelLabelFromContext(compiled.context)}.json`,
      bytes: encodeJson(buildBindingsJson(compiled, compiled.context.levelKey)),
    },
    {
      path: `Data/Scripts/config/placements/${levelLabelFromContext(compiled.context)}.json`,
      bytes: encodeJson(
        buildPlacementsJson(compiled, compiled.context.levelKey),
      ),
    },
    {
      path: "Data/Scripts/config/objects.json",
      bytes: encodeJson(buildObjectsJson(compiled)),
    },
    {
      path: "Data/Scripts/config/params.json",
      bytes: encodeJson(buildParamsJson(compiled)),
    },
  ];

  files.push(...buildScriptTypePackageFiles(compiled));

  for (const sourceFile of Object.values(compiled.sourceFiles)) {
    if (sourceFile.path === GENERATED_ENTRY_PATH) {
      continue;
    }
    files.push({
      path: sourceFile.path,
      bytes: encodeText(sourceFile.content),
    });
  }

  for (const compiledFile of Object.values(compiled.compiledFiles)) {
    if (compiledFile.path !== BUNDLED_RUNTIME_PATH) {
      continue;
    }
    files.push({
      path: compiledFile.path,
      bytes: encodeText(compiledFile.content),
    });
  }

  for (const asset of Object.values(compiled.assets)) {
    files.push({
      path: asset.path,
      bytes: asset.bytes,
    });
  }

  return ok(files);
}

export function buildPreviewScriptFiles(
  state: ScriptWorkspaceState,
): Result<readonly PreviewVfsFile[], string> {
  const packageResult = buildScriptPackageFiles(state);
  if (packageResult.isErr()) {
    return err(packageResult.error);
  }

  return ok(
    packageResult.value.map((file) => ({
      path: `/${file.path}`,
      data: file.bytes,
    })),
  );
}

export function buildScriptPackageZip(
  state: ScriptWorkspaceState,
): Result<Uint8Array, string> {
  const packageResult = buildScriptPackageFiles(state);
  if (packageResult.isErr()) {
    return err(packageResult.error);
  }

  const zipInput: Record<string, Uint8Array> = Object.fromEntries(
    packageResult.value.map((file) => [file.path, file.bytes]),
  );

  return Result.fromThrowable(
    () => zipSync(zipInput, { level: 6 }),
    () => "Failed to build script package zip",
  )();
}

function decodeJsonFile<T>(
  files: Readonly<Record<string, Uint8Array>>,
  path: string,
  schema: z.ZodSchema<T>,
): Result<T | null, string> {
  const bytes = files[path];
  if (!bytes) {
    return ok(null);
  }

  const parseJson = Result.fromThrowable(
    () => JSON.parse(strFromU8(bytes)),
    () => `Failed to parse ${path}`,
  )();
  if (parseJson.isErr()) {
    return err(parseJson.error);
  }

  const parsed = schema.safeParse(parseJson.value);
  if (!parsed.success) {
    return err(`${path}: ${parsed.error.message}`);
  }

  return ok(parsed.data);
}

export function importScriptPackageZip(
  bytes: Uint8Array,
  context: ScriptWorkspaceContext,
): Result<ScriptWorkspaceState, string> {
  const unzipResult = Result.fromThrowable(
    () => unzipSync(bytes),
    () => "Failed to read uploaded script package",
  )();
  if (unzipResult.isErr()) {
    return err(unzipResult.error);
  }

  const files = unzipResult.value;

  // Run validation
  const validationResult = validateScriptPackage(files, context);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  const workspace = createEmptyWorkspace(context);
  const projectJsonResult = decodeJsonFile(
    files,
    "Data/Scripts/config/project.json",
    scriptProjectSchema,
  );
  if (projectJsonResult.isErr()) {
    return err(projectJsonResult.error);
  }
  const runtimeLevelsResult = decodeJsonFile(
    files,
    "Data/Scripts/config/levels.json",
    runtimeLevelsSchema,
  );
  if (runtimeLevelsResult.isErr()) {
    return err(runtimeLevelsResult.error);
  }

  const objectsResult = decodeJsonFile(
    files,
    "Data/Scripts/config/objects.json",
    scriptObjectsFileSchema,
  );
  if (objectsResult.isErr()) {
    return err(objectsResult.error);
  }
  const paramsResult = decodeJsonFile(
    files,
    "Data/Scripts/config/params.json",
    scriptParamsFileSchema,
  );
  if (paramsResult.isErr()) {
    return err(paramsResult.error);
  }

  const projectJson = projectJsonResult.value;
  const importedFiles = Object.entries(files)
    .filter(([path]) => path.startsWith("Data/Scripts/src/"))
    .filter(([path]) => path !== GENERATED_ENTRY_PATH);

  const legacyTsPath = importedFiles.find(
    ([path]) => path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".js")
  );
  if (legacyTsPath) {
    return err("Legacy TypeScript/JavaScript package detected. This editor only supports Lua 5.4 scripting. Please convert your scripts to Lua before importing.");
  }

  const nonLuaSourcePath = importedFiles.find(
    ([path]) => !isLuaSourcePath(path),
  );
  if (nonLuaSourcePath) {
    return err(`Script source files must be Lua: ${nonLuaSourcePath[0]}`);
  }

  const importedSourceFiles = importedFiles
    .map(([path, fileBytes]) =>
      createSourceFile(path, strFromU8(fileBytes), "user"),
    );

  const sourceFiles: Record<string, ScriptSourceFile> = Object.fromEntries(
    importedSourceFiles.map((file) => [file.path, file]),
  );
  sourceFiles[USER_BOOTSTRAP_PATH] =
    sourceFiles[USER_BOOTSTRAP_PATH] ??
    createSourceFile(USER_BOOTSTRAP_PATH, buildBaseRuntimeTemplate(), "user");

  const importedAssets = Object.entries(files).filter(
    ([path]) =>
      path.startsWith("Data/Scripts/assets/models/") ||
      path.startsWith("Data/Scripts/assets/skeletons/"),
  );
  const assets: Record<string, ScriptAssetFile> = Object.fromEntries(
    importedAssets.map(([path, assetBytes]) => [
      path,
      {
        path,
        bytes: assetBytes,
        sourceName: path.split("/").at(-1) ?? path,
      },
    ]),
  );

  // Read all levels to preserve multi-level package data
  const nextLevels: Record<string, ScriptLevelState> = {};
  if (projectJson?.editor.levels) {
    for (const levelKey of Object.keys(projectJson.editor.levels)) {
      const levelLabel = levelKey === "current" ? "current" : `level-${levelKey}`;
      const bindingsPath = `Data/Scripts/config/bindings/${levelLabel}.json`;
      const placementsPath = `Data/Scripts/config/placements/${levelLabel}.json`;

      let terrainBindings: ScriptTerrainBinding[] = [];
      let splineBindings: ScriptSplineBinding[] = [];
      let mapItemBindings: ScriptMapItemBinding[] = [];
      let customPlacements: ScriptCustomObjectPlacement[] = [];

      const bBytes = files[bindingsPath];
      if (bBytes) {
        const bResult = decodeJsonFile(files, bindingsPath, scriptBindingsFileSchema);
        if (bResult.isOk() && bResult.value) {
          terrainBindings = [...bResult.value.terrainBindings];
          splineBindings = [...bResult.value.splineBindings];
          mapItemBindings = [...bResult.value.mapItemBindings];
        }
      }

      const pBytes = files[placementsPath];
      if (pBytes) {
        const pResult = decodeJsonFile(files, placementsPath, scriptPlacementsFileSchema);
        if (pResult.isOk() && pResult.value) {
          customPlacements = [...pResult.value.placements];
        }
      }

      nextLevels[levelKey] = {
        globalHooks: projectJson.editor.levels[levelKey]?.globalHooks ?? [],
        terrainBindings,
        splineBindings,
        mapItemBindings,
        customPlacements,
      };
    }
  }

  // Ensure current context level is present
  if (!nextLevels[context.levelKey]) {
    nextLevels[context.levelKey] = {
      globalHooks: [],
      terrainBindings: [],
      splineBindings: [],
      mapItemBindings: [],
      customPlacements: [],
    };
  }

  const nextState: ScriptWorkspaceState = refreshGeneratedEntry(
    {
      ...workspace,
      activeFilePath: projectJson?.editor.activeFilePath ?? USER_BOOTSTRAP_PATH,
      behaviorCatalog:
        projectJson?.editor.behaviorCatalog ?? workspace.behaviorCatalog,
      moduleOrder: projectJson?.editor.moduleOrder.length
        ? projectJson.editor.moduleOrder
        : Object.keys(sourceFiles).filter(
            (path) => path !== GENERATED_ENTRY_PATH,
          ),
      sourceFiles,
      assets,
      customObjects: objectsResult.value?.objects ?? [],
      params: paramsResult.value?.params ?? [],
      diagnostics: projectJson?.editor.diagnostics ?? [],
      statusLog: projectJson?.editor.statusLog ?? ["Imported script package"],
      sampleId: projectJson?.editor.sampleId ?? null,
      levels: nextLevels,
    },
    context,
  );

  const compileResult = compileScriptWorkspace(nextState);
  return compileResult.isOk()
    ? ok(compileResult.value)
    : err(compileResult.error);
}

function createSampleWorkspace(
  context: ScriptWorkspaceContext,
  sampleId: string,
): ScriptWorkspaceState {
  let state = createEmptyWorkspace(context);
  state = {
    ...state,
    sampleId,
  };

  if (
    sampleId === "otto-humans-jump" &&
    context.gameId === "OttoMatic-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "otto.humans-jump");
    return addStatusLog(state, "Loaded Otto humans jump sample");
  }

  if (
    sampleId === "bugdom-bouncing-friends" &&
    context.gameId === "Bugdom-android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "bugdom.bouncing-friends");
    return addStatusLog(state, "Loaded Bugdom bouncing friends sample");
  }

  if (
    sampleId === "bugdom2-clover-bob" &&
    context.gameId === "Bugdom2-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "bugdom2.clover-bob");
    return addStatusLog(state, "Loaded Bugdom 2 clover bob sample");
  }

  if (
    sampleId === "cromag-bouncing-pickups" &&
    context.gameId === "CroMagRally-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "cromag.bouncing-pickups");
    return addStatusLog(state, "Loaded Cro-Mag bouncing pickups sample");
  }

  if (
    sampleId === "nanosaur-hover-eggs" &&
    context.gameId === "Nanosaur-android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "nanosaur.hover-eggs");
    return addStatusLog(state, "Loaded Nanosaur hover eggs sample");
  }

  if (
    sampleId === "nanosaur2-powerup-spin" &&
    context.gameId === "Nanosaur2-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "nanosaur2.powerup-spin");
    return addStatusLog(state, "Loaded Nanosaur 2 powerup spin sample");
  }

  if (
    sampleId === "billy-cacti-bounce" &&
    context.gameId === "BillyFrontier-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "billy.cacti-bounce");
    return addStatusLog(state, "Loaded Billy cacti bounce sample");
  }

  if (
    sampleId === "mightymike-box-bob" &&
    context.gameId === "MightyMike-Android"
  ) {
    state = applyGlobalBehavior(state, "onObjectFrame", "mightymike.box-bob");
    return addStatusLog(state, "Loaded Mighty Mike box bob sample");
  }

  if (sampleId === "log-level-start") {
    const preferredHook = context.supportedHooks.includes("onLevelStart")
      ? "onLevelStart"
      : context.supportedHooks.includes("onAreaStart")
        ? "onAreaStart"
        : "onRaceStart";
    state = applyGlobalBehavior(state, preferredHook, "sample.log-level-start");
    return addStatusLog(state, "Loaded log level start sample");
  }

  if (sampleId === "hover-beacon") {
    state = createCustomObjectFromBehavior(
      state,
      "sample.hover-beacon",
      "sample.hoverBeacon",
      "Hover Beacon",
    );
    state = placeCustomObject(state, "sample.hoverBeacon", "Hover Beacon", {
      x: 0,
      y: 160,
      z: 0,
    });
    return addStatusLog(state, "Loaded hover beacon sample");
  }

  return addStatusLog(state, "Loaded empty script sample");
}

export function getScriptSamples(
  context: ScriptWorkspaceContext,
): readonly ScriptSampleDefinition[] {
  const shared: readonly ScriptSampleDefinition[] = [
    {
      id: "log-level-start",
      label: "Log Level Start",
      description:
        "Minimal startup hook that confirms the script bundle is live.",
      createState: (sampleContext) =>
        createSampleWorkspace(sampleContext, "log-level-start"),
    },
    {
      id: "hover-beacon",
      label: "Hover Beacon",
      description:
        "Sample scripted object definition plus placement for extended packages.",
      createState: (sampleContext) =>
        createSampleWorkspace(sampleContext, "hover-beacon"),
    },
  ];

  if (context.gameId === "OttoMatic-Android") {
    return [
      {
        id: "otto-humans-jump",
        label: "Otto Humans Jump",
        description:
          "Bobs Otto human rescue targets in place using object-frame tags.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "otto-humans-jump"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "Bugdom-android") {
    return [
      {
        id: "bugdom-bouncing-friends",
        label: "Bugdom Bouncing Friends",
        description:
          "Applies a bobbing offset to Bugdom ladybugs or helper buddies.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "bugdom-bouncing-friends"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "Bugdom2-Android") {
    return [
      {
        id: "bugdom2-clover-bob",
        label: "Bugdom 2 Clover & Acorn Bob",
        description:
          "Applies a bobbing offset to Bugdom 2 collectibles (clovers, acorns, etc.).",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "bugdom2-clover-bob"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "CroMagRally-Android") {
    return [
      {
        id: "cromag-bouncing-pickups",
        label: "Cro-Mag Bouncing Pickups",
        description:
          "Bobs bone pick-ups or arrow elements in Cro-Mag Rally.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "cromag-bouncing-pickups"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "Nanosaur-android") {
    return [
      {
        id: "nanosaur-hover-eggs",
        label: "Nanosaur Hover Eggs",
        description:
          "Causes Nanosaur eggs to bob/hover in place.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "nanosaur-hover-eggs"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "Nanosaur2-Android") {
    return [
      {
        id: "nanosaur2-powerup-spin",
        label: "Nanosaur 2 Powerup Spin",
        description:
          "Bobs or offsets powerups and egg nests in Nanosaur 2.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "nanosaur2-powerup-spin"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "BillyFrontier-Android") {
    return [
      {
        id: "billy-cacti-bounce",
        label: "Billy Cacti Bounce",
        description:
          "Bobs cacti or target elements in Billy Frontier.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "billy-cacti-bounce"),
      },
      ...shared,
    ];
  }

  if (context.gameId === "MightyMike-Android") {
    return [
      {
        id: "mightymike-box-bob",
        label: "Mighty Mike Box Bob",
        description:
          "Bobs weapon/powerup boxes in Mighty Mike.",
        createState: (sampleContext) =>
          createSampleWorkspace(sampleContext, "mightymike-box-bob"),
      },
      ...shared,
    ];
  }

  return shared;
}

export function loadScriptSample(
  context: ScriptWorkspaceContext,
  sampleId: string,
): ScriptWorkspaceState {
  const sample = getScriptSamples(context).find(
    (candidate) => candidate.id === sampleId,
  );
  return sample ? sample.createState(context) : createEmptyWorkspace(context);
}

export function addScriptAsset(
  state: ScriptWorkspaceState,
  path: string,
  bytes: Uint8Array,
  sourceName: string,
): ScriptWorkspaceState {
  return {
    ...state,
    assets: {
      ...state.assets,
      [path]: {
        path,
        bytes,
        sourceName,
      },
    },
  };
}

export function addScriptParam(
  state: ScriptWorkspaceState,
  param: ScriptParameterDefinition,
): ScriptWorkspaceState {
  const existing = state.params.find((candidate) => candidate.id === param.id);
  return {
    ...state,
    params: existing
      ? state.params.map((candidate) =>
          candidate.id === param.id ? param : candidate,
        )
      : [...state.params, param],
  };
}

export function addBehaviorDefinition(
  state: ScriptWorkspaceState,
  definition: {
    target: string;
    hooks: ScriptHookId[];
    id: string;
    label: string;
    description: string;
    tags: string[];
    objectType?: string;
    sourceFilePath: string;
    sourceTemplate: string;
  },
): ScriptWorkspaceState {
  const targetKinds: ScriptTargetKind[] = (() => {
    switch (definition.target) {
      case "global":
        return ["global"];
      case "terrainItem":
        return ["terrainItem"];
      case "splineItem":
        return ["splineItem"];
      case "mightyMikeItem":
        return ["mapItem"];
      case "objectType":
        return ["objectType"];
      case "customObject":
        return ["customObject"];
      default:
        return ["terrainItem"];
    }
  })();

  const sourceFilePath = definition.sourceFilePath;

  const behaviorDef: ScriptBehaviorDefinition = {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    category: "user",
    targetKinds,
    supportedHooks: definition.hooks,
    sourceFilePath,
    objectType: definition.objectType,
    previewSupport: "preview-ready",
    defaultTags: definition.tags,
    contributedTags: [],
    template: definition.sourceTemplate,
  };

  const sourceFile = createSourceFile(
    sourceFilePath,
    definition.sourceTemplate,
    "user",
    definition.id,
  );

  return refreshGeneratedEntry(
    {
      ...state,
      behaviorCatalog: [...state.behaviorCatalog, behaviorDef],
      sourceFiles: {
        ...state.sourceFiles,
        [sourceFilePath]: sourceFile,
      },
      activeFilePath: sourceFilePath,
      moduleOrder: state.moduleOrder.includes(sourceFilePath)
        ? state.moduleOrder
        : [...state.moduleOrder, sourceFilePath],
    },
    state.context,
  );
}
