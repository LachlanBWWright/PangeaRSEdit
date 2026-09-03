import { useEffect, useState } from "react";
import { Provider, createStore, useAtomValue } from "jotai";
import { useImmer, type Updater } from "use-immer";
import type { HeaderData, ItemData, LiquidData, FenceData, SplineData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { BugdomGlobals, Bugdom2Globals, BillyFrontierGlobals, CroMagGlobals, Game, Globals, MightyMikeGlobals, Nanosaur2Globals, NanosaurGlobals, OttoGlobals } from "@/data/globals/globals";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { LevelNumber } from "@/data/globals/levelNumber";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { openFile } from "@/editor/loadLogic/openFile";
import { View } from "@/editor/viewEnum";
import { SelectedItem } from "@/data/items/itemAtoms";
import { MenuSection } from "@/editor/gameViews/MenuSection";
import { StandardEditorToolbar } from "@/editor/toolbars/StandardEditorToolbar";
import { Bugdom1EditorToolbar } from "@/editor/toolbars/Bugdom1EditorToolbar";
import { Nanosaur1EditorToolbar } from "@/editor/toolbars/Nanosaur1EditorToolbar";
import { MightyMikeEditorToolbar } from "@/editor/toolbars/MightyMikeEditorToolbar";
import { FenceMenu } from "@/editor/subviews/fences/FenceMenu";
import { ItemMenu } from "@/editor/subviews/items/ItemMenu";
import { MightyMikeItemMenu } from "@/editor/subviews/items/MightyMikeItemMenu";
import { WaterMenu } from "@/editor/subviews/water/WaterMenu";
import { SplineMenu } from "@/editor/subviews/splines/SplineMenu";
import { ScriptsMenu } from "@/editor/subviews/scripts/ScriptsMenu";
import { StandardTilesMenu } from "@/editor/gameViews/StandardTilesMenu";
import { OttoMaticTilesMenu } from "@/editor/gameViews/OttoMaticTilesMenu";
import { IndividualTilesMenu } from "@/editor/gameViews/IndividualTilesMenu";
import { SupertileMenu } from "@/editor/subviews/supertiles/SupertilesMenu";
import { BugdomTileMenu } from "@/editor/subviews/bugdom/BugdomTileMenu";
import { BugdomTerrainMenu } from "@/editor/subviews/bugdom/BugdomTerrainMenu";
import { BugdomMetadataMenu } from "@/editor/subviews/bugdom/BugdomMetadataMenu";
import { NanosaurCollisionPathMenu } from "@/editor/subviews/tiles/NanosaurCollisionPathMenu";
import { MightyMikeTileMenu } from "@/editor/subviews/mightymike/MightyMikeTileMenu";
import { MightyMikeTilesetDataPanel } from "@/editor/subviews/mightymike/MightyMikeTilesetDataPanel";
import { getFeatureFlags, setFeatureFlags } from "@/config/featureFlags";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface GameMenuConfig {
  readonly game: Game;
  readonly name: string;
  readonly levelUrl: string;
  readonly tabs: readonly { readonly label: string; readonly view: View }[];
}

export const EDITOR_MENUS: readonly GameMenuConfig[] = [
  {
    game: Game.OTTO_MATIC,
    name: "Otto Matic",
    levelUrl: "/assets/ottoMatic/terrain/EarthFarm.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Water", view: View.water },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Tiles", view: View.tiles },
      { label: "Supertiles", view: View.supertiles },
    ],
  },
  {
    game: Game.BUGDOM,
    name: "Bugdom",
    levelUrl: "/assets/bugdom/terrain/Lawn.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Terrain", view: View.tiles },
      { label: "Visual Tiles", view: View.supertiles },
      { label: "Metadata", view: View.vertexColors },
    ],
  },
  {
    game: Game.BUGDOM_2,
    name: "Bugdom 2",
    levelUrl: "/assets/bugdom2/terrain/Level1_Garden.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Water", view: View.water },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Tiles", view: View.tiles },
      { label: "Supertiles", view: View.supertiles },
    ],
  },
  {
    game: Game.NANOSAUR,
    name: "Nanosaur",
    levelUrl: "/assets/nanosaur/terrain/Level1.ter",
    tabs: [
      { label: "Items", view: View.items },
      { label: "Scripts", view: View.scripts },
      { label: "Terrain", view: View.tiles },
      { label: "Visual Tiles", view: View.supertiles },
      { label: "Collision & Paths", view: View.collisionPath },
    ],
  },
  {
    game: Game.NANOSAUR_2,
    name: "Nanosaur 2",
    levelUrl: "/assets/nanosaur2/terrain/level1.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Water", view: View.water },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Tiles", view: View.tiles },
      { label: "Supertiles", view: View.supertiles },
    ],
  },
  {
    game: Game.CRO_MAG,
    name: "Cro-Mag Rally",
    levelUrl: "/assets/croMag/terrain/StoneAge_Desert.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Water", view: View.water },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Tiles", view: View.tiles },
      { label: "Supertiles", view: View.supertiles },
    ],
  },
  {
    game: Game.BILLY_FRONTIER,
    name: "Billy Frontier",
    levelUrl: "/assets/billyFrontier/terrain/town_shootout.ter",
    tabs: [
      { label: "Fences", view: View.fences },
      { label: "Water", view: View.water },
      { label: "Items", view: View.items },
      { label: "Splines", view: View.splines },
      { label: "Scripts", view: View.scripts },
      { label: "Tiles", view: View.tiles },
      { label: "Supertiles", view: View.supertiles },
    ],
  },
  {
    game: Game.MIGHTY_MIKE,
    name: "Mighty Mike",
    levelUrl: "/assets/mightyMike/terrain/bargain.map-1",
    tabs: [
      { label: "Items", view: View.items },
      { label: "Scripts", view: View.scripts },
      { label: "Visual Tiles", view: View.supertiles },
      { label: "Behavior Tiles", view: View.tiles },
      { label: "Animations", view: View.animations },
    ],
  },
];

const GLOBALS_BY_GAME = {
  [Game.OTTO_MATIC]: OttoGlobals,
  [Game.BUGDOM]: BugdomGlobals,
  [Game.BUGDOM_2]: Bugdom2Globals,
  [Game.NANOSAUR]: NanosaurGlobals,
  [Game.NANOSAUR_2]: Nanosaur2Globals,
  [Game.CRO_MAG]: CroMagGlobals,
  [Game.BILLY_FRONTIER]: BillyFrontierGlobals,
  [Game.MIGHTY_MIKE]: MightyMikeGlobals,
} as const;

const EMPTY_LIQUID_DATA: LiquidData = {
  Liqd: { 1000: { name: "Water List", obj: [], order: 0 } },
};
const EMPTY_FENCE_DATA: FenceData = {
  Fenc: { 1000: { name: "Fence List", obj: [], order: 0 } },
  FnNb: {},
};
const EMPTY_SPLINE_DATA: SplineData = {
  Spln: { 1000: { name: "Spline List", obj: [], order: 0 } },
  SpNb: {},
  SpPt: {},
  SpIt: {},
};

function createStoryStore(config: GameMenuConfig, initialView?: View) {
  const store = createStore();
  store.set(Globals, GLOBALS_BY_GAME[config.game]);
  store.set(ActiveView, initialView ?? config.tabs[0]?.view ?? View.items);
  store.set(LevelNumber, 1);
  store.set(CanvasViewMode, CanvasView.TWO_D);
  return store;
}

function EditorToolbar({ config, hasSupertiles }: { config: GameMenuConfig; hasSupertiles: boolean }) {
  if (config.game === Game.BUGDOM) return <Bugdom1EditorToolbar compact />;
  if (config.game === Game.NANOSAUR) return <Nanosaur1EditorToolbar compact />;
  if (config.game === Game.MIGHTY_MIKE) return <MightyMikeEditorToolbar compact />;
  return <StandardEditorToolbar compact terrainHasSTgd={hasSupertiles} />;
}

interface MenuProps {
  readonly config: GameMenuConfig;
  readonly headerData: HeaderData;
  readonly setHeaderData: Updater<HeaderData>;
  readonly terrainData: TerrainData;
  readonly setTerrainData: Updater<TerrainData>;
  readonly mapImages: HTMLCanvasElement[];
  readonly setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  readonly itemData: ItemData;
  readonly setItemData: Updater<ItemData>;
  readonly liquidData: LiquidData;
  readonly setLiquidData: Updater<LiquidData>;
  readonly fenceData: FenceData;
  readonly setFenceData: Updater<FenceData>;
  readonly splineData: SplineData;
  readonly setSplineData: Updater<SplineData>;
}

interface EditorStoryLevel extends AtomicLevelData {
  readonly headerData: HeaderData;
  readonly terrainData: TerrainData;
  readonly itemData: ItemData;
}

function ActualMenu({ config, ...props }: MenuProps) {
  const view = useAtomValue(ActiveView);
  const { headerData, setHeaderData, terrainData, setTerrainData, mapImages, setMapImages, itemData, setItemData, liquidData, setLiquidData, fenceData, setFenceData, splineData, setSplineData } = props;
  const applyLevelScale = () => undefined;

  if (config.game === Game.MIGHTY_MIKE) {
    if (view === View.items) return <MightyMikeItemMenu itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />;
    if (view === View.scripts) return <ScriptsMenu headerData={headerData} itemData={itemData} liquidData={null} fenceData={null} splineData={null} terrainData={terrainData} mapImages={mapImages} />;
    if (view === View.supertiles) return <MightyMikeTileMenu mode="visual" headerData={headerData} terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} setMapImages={setMapImages} />;
    if (view === View.tiles) return <MightyMikeTileMenu mode="behavior" headerData={headerData} terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} setMapImages={setMapImages} />;
    return <MightyMikeTilesetDataPanel terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} />;
  }

  if (config.game === Game.BUGDOM || config.game === Game.NANOSAUR) {
    if (view === View.fences) return <FenceMenu fenceData={fenceData} setFenceData={setFenceData} />;
    if (view === View.items) return <ItemMenu itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />;
    if (view === View.splines) return <SplineMenu splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />;
    if (view === View.scripts) return <ScriptsMenu headerData={headerData} itemData={itemData} liquidData={null} fenceData={null} splineData={null} terrainData={terrainData} mapImages={mapImages} />;
    if (view === View.tiles) {
      return config.game === Game.BUGDOM ? (
        <BugdomTerrainMenu
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
        />
      ) : (
        <IndividualTilesMenu
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          onApplyLevelScale={applyLevelScale}
        />
      );
    }
    if (view === View.supertiles) return <BugdomTileMenu headerData={headerData} setHeaderData={setHeaderData} terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} setMapImages={setMapImages} />;
    if (view === View.vertexColors) return <BugdomMetadataMenu headerData={headerData} onApplyLevelScale={applyLevelScale} />;
    return <NanosaurCollisionPathMenu terrainData={terrainData} />;
  }

  if (view === View.fences) return <FenceMenu fenceData={fenceData} setFenceData={setFenceData} />;
  if (view === View.water) return <WaterMenu liquidData={liquidData} setLiquidData={setLiquidData} />;
  if (view === View.items) return <ItemMenu itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />;
  if (view === View.splines) return <SplineMenu splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />;
  if (view === View.scripts) return <ScriptsMenu headerData={headerData} itemData={itemData} liquidData={liquidData} fenceData={fenceData} splineData={splineData} terrainData={terrainData} mapImages={mapImages} />;
  if (view === View.tiles) {
    return config.game === Game.OTTO_MATIC ? <OttoMaticTilesMenu headerData={headerData} setHeaderData={setHeaderData} /> : <StandardTilesMenu headerData={headerData} setHeaderData={setHeaderData} terrainData={terrainData} />;
  }
  return <SupertileMenu headerData={headerData} setHeaderData={setHeaderData} terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} setMapImages={setMapImages} onApplyLevelScale={applyLevelScale} />;
}

function EditorMenuPanel({
  config,
  level,
  initialMapImages,
}: {
  config: GameMenuConfig;
  level: EditorStoryLevel;
  initialMapImages: HTMLCanvasElement[];
}) {
  const [headerData, setHeaderData] = useImmer(level.headerData);
  const [terrainData, setTerrainData] = useImmer<TerrainData>(level.terrainData);
  const [itemData, setItemData] = useImmer(level.itemData);
  const [liquidData, setLiquidData] = useImmer<LiquidData>(level.liquidData ?? EMPTY_LIQUID_DATA);
  const [fenceData, setFenceData] = useImmer<FenceData>(level.fenceData ?? EMPTY_FENCE_DATA);
  const [splineData, setSplineData] = useImmer<SplineData>(level.splineData ?? EMPTY_SPLINE_DATA);
  const [mapImages, setMapImages] = useState(initialMapImages);
  const view = useAtomValue(ActiveView);
  const selectedTab = config.tabs.find((tab) => tab.view === view) ?? config.tabs[0];
  const replaceMapImages = (next: HTMLCanvasElement[]) => setMapImages(next);
  const noOp = () => undefined;
  const props = { headerData, setHeaderData, terrainData, setTerrainData, mapImages, setMapImages: replaceMapImages, undoData: noOp, redoData: noOp, dataHistory: { items: [], index: 0 }, config, itemData, setItemData, liquidData, setLiquidData, fenceData, setFenceData, splineData, setSplineData };

  return (
    <div data-storybook-editor-menu data-editor-game={config.name} data-editor-tab={selectedTab?.label ?? ""}>
      <div className="min-w-0">
        <div data-editor-menu-toolbar className="min-w-0 border-b border-gray-700 p-2"><EditorToolbar config={config} hasSupertiles={Boolean(terrainData.STgd)} /></div>
        <div data-editor-menu-surface><MenuSection scrollable={view !== View.animations}><ActualMenu {...props} /></MenuSection></div>
      </div>
    </div>
  );
}

function StoryPanel({
  config,
  initialView,
}: {
  config: GameMenuConfig;
  initialView?: View;
}) {
  const [store] = useState(() => createStoryStore(config, initialView));
  const [level, setLevel] = useState<AtomicLevelData | null>(null);
  const [mapImages, setMapImages] = useState<HTMLCanvasElement[]>([]);

  useEffect(() => {
    void openFile({
      url: config.levelUrl,
      gameType: GLOBALS_BY_GAME[config.game],
      setGlobals: (globals) => store.set(Globals, globals),
      setMapFile: () => undefined,
      setMapImagesFile: () => undefined,
      setMapImages,
      setData: (nextLevel) => {
        if ((nextLevel.itemData?.Itms[1000]?.obj.length ?? 0) > 0) {
          store.set(SelectedItem, 0);
        }
        setLevel(nextLevel);
      },
    });
  }, [config, store]);

  if (
    !level?.headerData ||
    !level.terrainData ||
    !level.itemData ||
    mapImages.length === 0
  ) {
    return <p data-editor-menu-loading>Loading {config.name} level…</p>;
  }

  return (
    <TooltipProvider>
      <Provider store={store}>
        <EditorMenuPanel
          config={config}
          level={{
            ...level,
            headerData: level.headerData,
            terrainData: level.terrainData,
            itemData: level.itemData,
          }}
          initialMapImages={mapImages}
        />
      </Provider>
    </TooltipProvider>
  );
}

export function enableStoryScripting(): void {
  const flags = getFeatureFlags();
  setFeatureFlags({ ...flags, scripting: true });
}

export function GameEditorStory({
  game,
  view,
}: {
  game: Game;
  view?: View;
}) {
  const config = EDITOR_MENUS.find((candidate) => candidate.game === game);
  return config ? <StoryPanel config={config} initialView={view} /> : null;
}
