/**
 * Globals Module - Barrel Export
 * 
 * Provides unified access to game configuration and global state.
 */

export {
  Game,
  DataType,
  type GlobalsInterface,
  GLOBALS_PRESETS,
  Globals,
  GlobalsProvider,
} from "./globals";

export { LevelNumber } from "./levelNumber";
export { UndoHistory, RedoHistory } from "./history";
