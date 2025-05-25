// Global type definitions
interface TileEditingState {
  enabled: boolean;
  brushType: string;
  view: number;
  handleClick: (x: number, y: number) => void;
}

declare global {
  interface Window {
    tileEditingState?: TileEditingState;
  }
}

export {};
