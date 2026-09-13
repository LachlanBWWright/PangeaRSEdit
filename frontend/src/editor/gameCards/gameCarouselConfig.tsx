import React from "react";
import {
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
  MightyMikeGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import { OttoLevels } from "@/editor/gameLevelSelectors/OttoLevels";
import { BugdomLevels } from "@/editor/gameLevelSelectors/BugdomLevels";
import { Bugdom2Levels } from "@/editor/gameLevelSelectors/Bugdom2Levels";
import { CroMagLevels } from "@/editor/gameLevelSelectors/CroMagLevels";
import { NanosaurLevels } from "@/editor/gameLevelSelectors/NanosaurLevels";
import { Nanosaur2Levels } from "@/editor/gameLevelSelectors/Nanosaur2Levels";
import { BillyFrontierLevels } from "@/editor/gameLevelSelectors/BillyFrontierLevels";
import { MightyMikeLevels } from "@/editor/gameLevelSelectors/MightyMikeLevels";
import type { TunnelData, TunnelLevelKind } from "@/data/tunnelParser/types";

export interface LevelComponentProps {
  readonly openFile: (url: string, gameType: GlobalsInterface) => void;
  readonly onCreateScriptItemDemoLevel: (gameType: GlobalsInterface) => void;
  readonly onTunnelLoad?: (
    data: TunnelData,
    fileName: string,
    levelKind: TunnelLevelKind,
  ) => void;
}

interface GameConfig {
  readonly title: string;
  readonly globals: GlobalsInterface;
}

const OttoLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <OttoLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const BugdomLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <BugdomLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const Bugdom2LevelWrapper = ({
  openFile,
  onCreateScriptItemDemoLevel,
  onTunnelLoad,
}: LevelComponentProps) => (
  <Bugdom2Levels openFile={openFile} onTunnelLoad={onTunnelLoad} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const CroMagLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <CroMagLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const NanosaurLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <NanosaurLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const Nanosaur2LevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <Nanosaur2Levels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const BillyFrontierLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <BillyFrontierLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);
const MightyMikeLevelWrapper = ({ openFile, onCreateScriptItemDemoLevel }: LevelComponentProps) => (
  <MightyMikeLevels openFile={openFile} onCreateScriptItemDemoLevel={onCreateScriptItemDemoLevel} />
);

export const LEVEL_COMPONENTS_MAP: Record<
  string,
  React.ComponentType<LevelComponentProps>
> = {
  "Otto Matic": OttoLevelWrapper,
  Bugdom: BugdomLevelWrapper,
  "Bugdom 2": Bugdom2LevelWrapper,
  "Cro-Mag Rally": CroMagLevelWrapper,
  Nanosaur: NanosaurLevelWrapper,
  "Nanosaur 2": Nanosaur2LevelWrapper,
  "Billy Frontier": BillyFrontierLevelWrapper,
  "Mighty Mike": MightyMikeLevelWrapper,
};

const BASE_GAMES: readonly GameConfig[] = [
  { title: "Otto Matic", globals: OttoGlobals },
];

const EXTRA_GAMES: readonly GameConfig[] = [
  { title: "Bugdom", globals: BugdomGlobals },
  { title: "Bugdom 2", globals: Bugdom2Globals },
  { title: "Cro-Mag Rally", globals: CroMagGlobals },
  { title: "Nanosaur", globals: NanosaurGlobals },
  { title: "Nanosaur 2", globals: Nanosaur2Globals },
  { title: "Billy Frontier", globals: BillyFrontierGlobals },
  { title: "Mighty Mike", globals: MightyMikeGlobals },
];

export function getCarouselGames(showAllGames: boolean): GameConfig[] {
  return showAllGames ? [...BASE_GAMES, ...EXTRA_GAMES] : [...BASE_GAMES];
}
