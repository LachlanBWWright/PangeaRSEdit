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
import type { TunnelData } from "@/data/tunnelParser/types";

export interface LevelComponentProps {
  readonly openFile: (url: string, gameType: GlobalsInterface) => void;
  readonly onTunnelLoad?: (data: TunnelData, fileName: string) => void;
}

interface GameConfig {
  readonly title: string;
  readonly globals: GlobalsInterface;
}

const OttoLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <OttoLevels openFile={openFile} />
);
const BugdomLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <BugdomLevels openFile={openFile} />
);
const Bugdom2LevelWrapper = ({
  openFile,
  onTunnelLoad,
}: LevelComponentProps) => (
  <Bugdom2Levels openFile={openFile} onTunnelLoad={onTunnelLoad} />
);
const CroMagLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <CroMagLevels openFile={openFile} />
);
const NanosaurLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <NanosaurLevels openFile={openFile} />
);
const Nanosaur2LevelWrapper = ({ openFile }: LevelComponentProps) => (
  <Nanosaur2Levels openFile={openFile} />
);
const BillyFrontierLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <BillyFrontierLevels openFile={openFile} />
);
const MightyMikeLevelWrapper = ({ openFile }: LevelComponentProps) => (
  <MightyMikeLevels openFile={openFile} />
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
