import { Game } from "@/data/globals/globals";
import { Apple, Monitor, PanelsTopLeft, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GameDownloadVariant {
  id: "linux" | "macos" | "windows" | "android";
  label: string;
  fileName: string;
  icon: LucideIcon;
  className: string;
};

interface GameDownloadConfig {
  game: Game;
  portName: string;
  variants: readonly GameDownloadVariant[];
}

const DOWNLOADS_PATH = `${import.meta.env.BASE_URL}downloads`;

const variants = (portName: string): readonly GameDownloadVariant[] => [
  {
    id: "linux",
    label: "Linux",
    fileName: `${portName}-linux.AppImage`,
    icon: Monitor,
    className: "border-orange-700 bg-orange-900/40 hover:bg-orange-800/60",
  },
  {
    id: "macos",
    label: "macOS",
    fileName: `${portName}-mac.dmg`,
    icon: Apple,
    className: "border-slate-500 bg-slate-700/60 hover:bg-slate-600",
  },
  {
    id: "windows",
    label: "Windows",
    fileName: `${portName}-windows.zip`,
    icon: PanelsTopLeft,
    className: "border-blue-700 bg-blue-900/40 hover:bg-blue-800/60",
  },
  {
    id: "android",
    label: "Android",
    fileName: `${portName}-android.apk`,
    icon: Smartphone,
    className: "border-green-700 bg-green-900/40 hover:bg-green-800/60",
  },
];

export const GAME_DOWNLOAD_CONFIGS: readonly GameDownloadConfig[] = [
  { game: Game.BILLY_FRONTIER, portName: "BillyFrontier-Android", variants: variants("BillyFrontier-Android") },
  { game: Game.BUGDOM, portName: "Bugdom-android", variants: variants("Bugdom-android") },
  { game: Game.BUGDOM_2, portName: "Bugdom2-Android", variants: variants("Bugdom2-Android") },
  { game: Game.CRO_MAG, portName: "CroMagRally-Android", variants: variants("CroMagRally-Android") },
  { game: Game.MIGHTY_MIKE, portName: "MightyMike-Android", variants: variants("MightyMike-Android") },
  { game: Game.NANOSAUR, portName: "Nanosaur-android", variants: variants("Nanosaur-android") },
  { game: Game.NANOSAUR_2, portName: "Nanosaur2-Android", variants: variants("Nanosaur2-Android") },
  { game: Game.OTTO_MATIC, portName: "OttoMatic-Android", variants: variants("OttoMatic-Android") },
];

export const getGameDownloadConfig = (
  game: Game,
): GameDownloadConfig | undefined =>
  GAME_DOWNLOAD_CONFIGS.find((config) => config.game === game);

export const getGameDownloadUrl = (
  portName: string,
  fileName: string,
): string => `${DOWNLOADS_PATH}/${portName}/${fileName}`;
