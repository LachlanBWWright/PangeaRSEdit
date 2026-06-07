import { strToU8 } from "fflate";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export interface ScriptTypeDeclarationFile {
  readonly path: string;
  readonly content: string;
}

function buildHookSignatures(state: ScriptWorkspaceState): string {
  return state.context.supportedHooks
    .map((hookId) => {
      if (hookId === "onObjectFrame") {
        return `  ${hookId}?: (ctx: ObjectFrameContext) => ObjectFrameResult | void;`;
      }
      if (
        hookId === "onTerrainItem" ||
        hookId === "onSplineItem" ||
        hookId === "onMapItem"
      ) {
        const contextType =
          hookId === "onTerrainItem"
            ? "TerrainItemContext"
            : hookId === "onSplineItem"
              ? "SplineItemContext"
              : "MikeMapItemContext";
        return `  ${hookId}?: (ctx: ${contextType}) => ItemSpawnResult | void;`;
      }
      if (
        hookId === "onCheckpoint" ||
        hookId === "onLapComplete" ||
        hookId === "onPowerupCollected" ||
        hookId === "onRaceFinish"
      ) {
        return `  ${hookId}?: (...args: readonly unknown[]) => void;`;
      }
      return `  ${hookId}?: (ctx: LevelContext | FrameContext | SceneAreaContext | RaceContext) => void;`;
    })
    .join("\n");
}

function buildTagDeclarations(state: ScriptWorkspaceState): string {
  const tags = state.context.allowedTags
    .concat(
      state.behaviorCatalog.flatMap((behavior) => behavior.contributedTags),
    )
    .map((tag) => JSON.stringify(tag.id));

  return tags.length > 0 ? tags.join(" | ") : "string";
}

function buildRuntimeDeclaration(state: ScriptWorkspaceState): string {
  return [
    "declare const globalThis: Record<string, unknown>;",
    "declare function require(path: string): unknown;",
    "",
    "type ScriptTag = " + buildTagDeclarations(state) + ";",
    "",
    'declare module "pangea" {',
    '  export type GameId = "BillyFrontier-Android" | "Bugdom-android" | "Bugdom2-Android" | "CroMagRally-Android" | "MightyMike-Android" | "Nanosaur-android" | "Nanosaur2-Android" | "OttoMatic-Android";',
    "  export interface Vector2 { readonly x: number; readonly y: number; }",
    "  export interface Vector3 { readonly x: number; readonly y: number; readonly z: number; }",
    "  export interface ObjectHandle { readonly id: number; readonly generation: number; }",
    "  export interface GameContext { readonly gameId: GameId; readonly gameName: string; }",
    "  export interface LevelContext extends GameContext { readonly levelNum: number; readonly levelName?: string; }",
    "  export interface FrameContext extends LevelContext { readonly frameNum: number; readonly deltaSeconds: number; readonly levelTimeSeconds: number; }",
    "  export interface ObjectFrameContext extends FrameContext { readonly object: ObjectHandle; readonly position: Vector3; readonly tags: readonly ScriptTag[]; }",
    "  export interface ObjectFrameResult { readonly positionOffset?: Vector3; }",
    "  export interface TerrainItemContext extends LevelContext { readonly itemType: number; readonly remappedItemType: number; readonly position: Vector3; readonly flags: number; readonly params: readonly number[]; }",
    "  export interface SplineItemContext extends LevelContext { readonly itemType: number; readonly splineNum: number; readonly placement: number; readonly params: readonly number[]; }",
    "  export interface MikeMapItemContext extends GameContext { readonly scene: number; readonly area: number; readonly itemType: number; readonly position: Vector2; readonly params: readonly number[]; }",
    "  export type ItemSpawnResult = { readonly handled: true; readonly markInUse?: boolean } | { readonly handled: false };",
    "  export interface ScriptedObjectSelf { readonly handle: ObjectHandle; readonly state: Record<string, unknown>; }",
    "  export interface ScriptedObjectDefinition { readonly onSpawn?: (self: ScriptedObjectSelf, ctx: LevelContext) => void; readonly onUpdate?: (self: ScriptedObjectSelf, ctx: FrameContext) => void; readonly onCollision?: (self: ScriptedObjectSelf, other: ObjectHandle, ctx: FrameContext) => void; readonly onDamage?: (self: ScriptedObjectSelf, amount: number, ctx: FrameContext) => number; readonly onDelete?: (self: ScriptedObjectSelf, ctx: LevelContext) => void; }",
    "  export interface NativeSpawnOptions { readonly amount?: number; readonly subtype?: number; }",
    "  export interface ScriptedSpawnOptions { readonly speed?: number; readonly amount?: number; readonly radius?: number; }",
    "  export interface PangeaApi { readonly api: { readonly version: 1 }; readonly game: { readonly id: GameId; readonly name: string }; readonly level: { current(): number }; readonly time: { delta(): number }; readonly log: { info(message: string): void; warn(message: string): void; error(message: string): void; }; readonly player: { get(playerNum: number): ObjectHandle | undefined; }; readonly object: { position(handle: ObjectHandle): Vector3 | undefined; setPosition(handle: ObjectHandle, position: Vector3): boolean; setVelocity(handle: ObjectHandle, velocity: Vector3): boolean; delete(handle: ObjectHandle): boolean; }; readonly spawn: { native(id: string, position: Vector3, options?: NativeSpawnOptions): ObjectHandle | undefined; scripted(id: string, position: Vector3, options?: ScriptedSpawnOptions): ObjectHandle | undefined; }; }",
    "  export const pangea: PangeaApi;",
    "  export interface TerrainItemDefinition { readonly id: string; readonly nativeType: number; readonly onSpawn: (item: TerrainItemContext) => ItemSpawnResult | void; }",
    "  export function defineTerrainItem<TDefinition extends TerrainItemDefinition>(definition: TDefinition): TDefinition;",
    "  export function defineScriptedObject(definition: ScriptedObjectDefinition): ScriptedObjectDefinition;",
    "}",
    "",
    'import type { FrameContext, GameContext, ItemSpawnResult, LevelContext, MikeMapItemContext, ObjectFrameContext, ObjectFrameResult, PangeaApi, ScriptedObjectDefinition, ScriptedObjectSelf, SplineItemContext, TerrainItemContext, Vector2, Vector3, ObjectHandle } from "pangea";',
    'import { defineScriptedObject, defineTerrainItem, pangea } from "pangea";',
    "",
    "declare global {",
    "  const pangea: PangeaApi;",
    "  function defineTerrainItem<TDefinition extends import('pangea').TerrainItemDefinition>(definition: TDefinition): TDefinition;",
    "  function defineScriptedObject(definition: ScriptedObjectDefinition): ScriptedObjectDefinition;",
    "  type Vector2 = import('pangea').Vector2;",
    "  type Vector3 = import('pangea').Vector3;",
    "  type ObjectHandle = import('pangea').ObjectHandle;",
    "  type GameContext = import('pangea').GameContext;",
    "  type LevelContext = import('pangea').LevelContext;",
    "  type FrameContext = import('pangea').FrameContext;",
    "  type ObjectFrameContext = import('pangea').ObjectFrameContext;",
    "  type ObjectFrameResult = import('pangea').ObjectFrameResult;",
    "  type TerrainItemContext = import('pangea').TerrainItemContext;",
    "  type SplineItemContext = import('pangea').SplineItemContext;",
    "  type MikeMapItemContext = import('pangea').MikeMapItemContext;",
    "  type ItemSpawnResult = import('pangea').ItemSpawnResult;",
    "  type ScriptedObjectSelf = import('pangea').ScriptedObjectSelf;",
    "  type ScriptedObjectDefinition = import('pangea').ScriptedObjectDefinition;",
    "  interface ScriptModule {",
    buildHookSignatures(state),
    "  }",
    "}",
    "",
    "export {};",
    "",
  ].join("\n");
}

const commonDeclaration = [
  'declare module "pangea/games/common" {',
  '  import type { FrameContext, GameContext, ItemSpawnResult, LevelContext, MikeMapItemContext, ObjectFrameContext, ObjectFrameResult, SplineItemContext, TerrainItemContext } from "pangea";',
  "  export interface AreaContext extends GameContext { readonly area: number; readonly areaName?: string; }",
  "  export interface SceneAreaContext extends GameContext { readonly scene: number; readonly area: number; readonly sceneName?: string; readonly areaName?: string; }",
  '  export interface RaceContext extends LevelContext { readonly mode: "local" | "practice" | "network"; readonly trackName?: string; }',
  "  export interface RaceConfigContext extends RaceContext { readonly lapCount: number; }",
  "  export interface RacePlayer { readonly playerNum: number; readonly local: boolean; }",
  "  export interface PowerupContext { readonly id: string; readonly itemType: number; }",
  "  export interface RaceResults { readonly placements: readonly RacePlayer[]; }",
  "  export type AdventureLifecycleModule<TLevel extends LevelContext, TFrame extends FrameContext> = Partial<{ onLevelLoad(ctx: TLevel): void; onLevelStart(ctx: TLevel): void; onFrame(ctx: TFrame): void; onObjectFrame(ctx: ObjectFrameContext): ObjectFrameResult | void; onLevelComplete(ctx: TLevel): void; onLevelUnload(ctx: TLevel): void; onTerrainItem(ctx: TerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: SplineItemContext): ItemSpawnResult | void; }>; ",
  "  export type MikeLifecycleModule<TScene extends SceneAreaContext, TArea extends SceneAreaContext> = Partial<{ onSceneLoad(ctx: TScene): void; onAreaLoad(ctx: TArea): void; onAreaStart(ctx: TArea): void; onAreaFrame(ctx: FrameContext): void; onObjectFrame(ctx: ObjectFrameContext): ObjectFrameResult | void; onMapItem(ctx: MikeMapItemContext): ItemSpawnResult | void; onAreaUnload(ctx: TArea): void; }>; ",
  "  export type RaceLifecycleModule<TRace extends RaceContext> = Partial<{ onRaceConfig(ctx: RaceConfigContext): void; onRaceStart(ctx: TRace): void; onObjectFrame(ctx: ObjectFrameContext): ObjectFrameResult | void; onCheckpoint(player: RacePlayer, checkpoint: number, ctx: TRace): void; onLapComplete(player: RacePlayer, lap: number, ctx: TRace): void; onPowerupCollected(player: RacePlayer, powerup: PowerupContext, ctx: TRace): void; onRaceFinish(results: RaceResults, ctx: TRace): void; }>; ",
  "}",
  "",
].join("\n");

const gameDeclarations = [
  'declare module "pangea/games/ottomatic" { import type { AdventureLifecycleModule } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, LevelContext, SplineItemContext, TerrainItemContext } from "pangea"; export interface OttoMaticLevelContext extends LevelContext { readonly gameId: "OttoMatic-Android"; readonly playerMode?: "robot" | "saucer"; } export interface OttoMaticFrameContext extends FrameContext { readonly gameId: "OttoMatic-Android"; } export interface OttoMaticTerrainItemContext extends TerrainItemContext { readonly gameId: "OttoMatic-Android"; } export interface OttoMaticSplineItemContext extends SplineItemContext { readonly gameId: "OttoMatic-Android"; } export type OttoMaticLifecycleModule = AdventureLifecycleModule<OttoMaticLevelContext, OttoMaticFrameContext> & Partial<{ onTerrainItem(ctx: OttoMaticTerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: OttoMaticSplineItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/bugdom" { import type { AdventureLifecycleModule } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, LevelContext, SplineItemContext, TerrainItemContext } from "pangea"; export interface BugdomLevelContext extends LevelContext { readonly gameId: "Bugdom-android"; } export interface BugdomFrameContext extends FrameContext { readonly gameId: "Bugdom-android"; } export interface BugdomTerrainItemContext extends TerrainItemContext { readonly gameId: "Bugdom-android"; } export interface BugdomSplineItemContext extends SplineItemContext { readonly gameId: "Bugdom-android"; } export type BugdomLifecycleModule = AdventureLifecycleModule<BugdomLevelContext, BugdomFrameContext> & Partial<{ onTerrainItem(ctx: BugdomTerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: BugdomSplineItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/bugdom2" { import type { AdventureLifecycleModule } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, LevelContext, SplineItemContext, TerrainItemContext } from "pangea"; export interface Bugdom2LevelContext extends LevelContext { readonly gameId: "Bugdom2-Android"; } export interface Bugdom2FrameContext extends FrameContext { readonly gameId: "Bugdom2-Android"; } export interface Bugdom2TerrainItemContext extends TerrainItemContext { readonly gameId: "Bugdom2-Android"; } export interface Bugdom2SplineItemContext extends SplineItemContext { readonly gameId: "Bugdom2-Android"; } export type Bugdom2LifecycleModule = AdventureLifecycleModule<Bugdom2LevelContext, Bugdom2FrameContext> & Partial<{ onTerrainItem(ctx: Bugdom2TerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: Bugdom2SplineItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/nanosaur" { import type { AdventureLifecycleModule } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, LevelContext, TerrainItemContext } from "pangea"; export interface NanosaurLevelContext extends LevelContext { readonly gameId: "Nanosaur-android"; } export interface NanosaurFrameContext extends FrameContext { readonly gameId: "Nanosaur-android"; } export interface NanosaurTerrainItemContext extends TerrainItemContext { readonly gameId: "Nanosaur-android"; } export type NanosaurLifecycleModule = AdventureLifecycleModule<NanosaurLevelContext, NanosaurFrameContext> & Partial<{ onTerrainItem(ctx: NanosaurTerrainItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/nanosaur2" { import type { AdventureLifecycleModule, RaceContext, RaceLifecycleModule } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, LevelContext, SplineItemContext, TerrainItemContext } from "pangea"; export type Nanosaur2Mode = "adventure" | "race" | "battle" | "capture"; export interface Nanosaur2LevelContext extends LevelContext { readonly gameId: "Nanosaur2-Android"; readonly mode: Nanosaur2Mode; readonly networked: boolean; } export interface Nanosaur2FrameContext extends FrameContext { readonly gameId: "Nanosaur2-Android"; readonly mode: Nanosaur2Mode; readonly networked: boolean; } export interface Nanosaur2TerrainItemContext extends TerrainItemContext { readonly gameId: "Nanosaur2-Android"; readonly mode: Nanosaur2Mode; readonly networked: boolean; } export interface Nanosaur2SplineItemContext extends SplineItemContext { readonly gameId: "Nanosaur2-Android"; readonly mode: Nanosaur2Mode; readonly networked: boolean; } export interface Nanosaur2RaceContext extends RaceContext { readonly gameId: "Nanosaur2-Android"; readonly networked: boolean; } export type Nanosaur2LifecycleModule = AdventureLifecycleModule<Nanosaur2LevelContext, Nanosaur2FrameContext> & RaceLifecycleModule<Nanosaur2RaceContext> & Partial<{ onTerrainItem(ctx: Nanosaur2TerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: Nanosaur2SplineItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/cromagrally" { import type { RaceContext, RaceLifecycleModule } from "pangea/games/common"; import type { ItemSpawnResult, TerrainItemContext } from "pangea"; export interface CroMagRaceContext extends RaceContext { readonly gameId: "CroMagRally-Android"; readonly networked: boolean; } export interface CroMagTerrainItemContext extends TerrainItemContext { readonly gameId: "CroMagRally-Android"; readonly playerNum: number; readonly networked: boolean; } export type CroMagRallyLifecycleModule = RaceLifecycleModule<CroMagRaceContext> & Partial<{ onTerrainItem(ctx: CroMagTerrainItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/mightymike" { import type { MikeLifecycleModule, SceneAreaContext } from "pangea/games/common"; import type { ItemSpawnResult, MikeMapItemContext } from "pangea"; export interface MikeSceneContext extends SceneAreaContext { readonly gameId: "MightyMike-Android"; } export interface MikeAreaContext extends SceneAreaContext { readonly gameId: "MightyMike-Android"; } export interface MikeMapItemHookContext extends MikeMapItemContext { readonly gameId: "MightyMike-Android"; } export type MightyMikeLifecycleModule = MikeLifecycleModule<MikeSceneContext, MikeAreaContext> & Partial<{ onMapItem(ctx: MikeMapItemHookContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games/billyfrontier" { import type { AreaContext } from "pangea/games/common"; import type { FrameContext, ItemSpawnResult, SplineItemContext, TerrainItemContext } from "pangea"; export type BillyAreaMode = "duel" | "shootout" | "stampede" | "targetPractice"; export interface BillyAreaContext extends AreaContext { readonly gameId: "BillyFrontier-Android"; readonly mode: BillyAreaMode; } export interface BillyFrameContext extends FrameContext { readonly gameId: "BillyFrontier-Android"; readonly mode: BillyAreaMode; } export interface BillyTerrainItemContext extends TerrainItemContext { readonly gameId: "BillyFrontier-Android"; readonly mode: BillyAreaMode; } export interface BillySplineItemContext extends SplineItemContext { readonly gameId: "BillyFrontier-Android"; readonly mode: BillyAreaMode; } export type BillyFrontierLifecycleModule = Partial<{ onAreaLoad(ctx: BillyAreaContext): void; onDuelStart(ctx: BillyAreaContext): void; onShootoutStart(ctx: BillyAreaContext): void; onStampedeStart(ctx: BillyAreaContext): void; onTargetPracticeStart(ctx: BillyAreaContext): void; onAreaFrame(ctx: BillyFrameContext): void; onAreaComplete(ctx: BillyAreaContext): void; onTerrainItem(ctx: BillyTerrainItemContext): ItemSpawnResult | void; onSplineItem(ctx: BillySplineItemContext): ItemSpawnResult | void; }>; }',
  'declare module "pangea/games" { export type * from "pangea/games/billyfrontier"; export type * from "pangea/games/bugdom"; export type * from "pangea/games/bugdom2"; export type * from "pangea/games/common"; export type * from "pangea/games/cromagrally"; export type * from "pangea/games/mightymike"; export type * from "pangea/games/nanosaur"; export type * from "pangea/games/nanosaur2"; export type * from "pangea/games/ottomatic"; }',
  "",
].join("\n");

export function buildScriptTypeDeclarationFiles(
  state: ScriptWorkspaceState,
): readonly ScriptTypeDeclarationFile[] {
  return [
    {
      path: "Data/Scripts/types/pangea-runtime.d.ts",
      content: buildRuntimeDeclaration(state),
    },
    {
      path: "Data/Scripts/types/pangea-games.d.ts",
      content: [commonDeclaration, gameDeclarations].join("\n"),
    },
  ];
}

export function buildScriptTypePackageFiles(
  state: ScriptWorkspaceState,
): readonly { readonly path: string; readonly bytes: Uint8Array }[] {
  return buildScriptTypeDeclarationFiles(state).map((file) => ({
    path: file.path,
    bytes: strToU8(file.content),
  }));
}
