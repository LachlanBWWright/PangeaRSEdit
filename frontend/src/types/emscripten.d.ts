/**
 * Global window augmentation for Emscripten Module and game-specific APIs.
 *
 * Each Pangea game WASM port exposes a Module object and optional game-specific
 * globals that allow external control of game state (fence collisions, level
 * skipping, terrain file overrides, etc.).
 */

declare global {
  interface Window {
    /** Emscripten Module object, configured before the game script loads. */
    Module?: {
      canvas?: HTMLCanvasElement;
      locateFile?: (path: string, scriptDirectory: string) => string;
      onRuntimeInitialized?: () => void;
      onAbort?: (reason?: unknown) => void;
      /** Called by Emscripten to report download progress text (e.g. "Downloading data..."). */
      setStatus?: (text: string) => void;
      /** Called by Emscripten with remaining dependency count; 0 means all loaded. */
      monitorRunDependencies?: (left: number) => void;
      ccall?: (
        fn: string,
        returnType: string | null,
        argTypes: string[],
        args: unknown[],
      ) => unknown;
      FS?: { writeFile: (path: string, data: Uint8Array) => void };
      [key: string]: unknown;
    };

    // ----- Bugdom: pre-load window globals -----
    BUGDOM_START_LEVEL?: number;
    BUGDOM_TERRAIN_FILE?: string;
    BUGDOM_NO_FENCE_COLLISION?: boolean;

    // ----- Bugdom 2: runtime gameAPI -----
    gameAPI?: {
      setFenceCollisionEnabled: (enabled: boolean) => void;
      setPlayerHealth: (health: number) => void;
      setPlayerLives: (lives: number) => void;
      setStartLevel: (level: number) => void;
      fullHeal: () => void;
      winLevel: () => void;
    };

    // ----- Cro-Mag Rally: runtime GameCheat -----
    GameCheat?: {
      setFenceCollision: (enabled: number) => void;
      getFenceCollision: () => number;
    };

    // ----- Nanosaur: exported functions -----
    SetFenceCollisionsEnabled?: (enabled: number) => void;
    SetCustomTerrainFile?: (path: string) => void;
    ClearCustomTerrainFile?: () => void;
    CheatRestoreHealth?: () => void;
    CheatFillFuel?: () => void;
    CheatGetWeapons?: () => void;
  }
}

export {};
