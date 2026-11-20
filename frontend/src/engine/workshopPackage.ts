import type { EnginePackage } from "./enginePackage";

const root = "../../../games/pangea-ports/games/PangeaSandbox/Data/Packages/Workshop/";
const sources = import.meta.glob<string>("../../../games/pangea-ports/games/PangeaSandbox/Data/Packages/Workshop/**/*.{lua,json}", { query: "?raw", import: "default", eager: true });
export function createWorkshopPackage(): EnginePackage {
  return { files: Object.entries(sources).map(([path, text]) => ({ path: path.slice(root.length), bytes: new TextEncoder().encode(text) })) };
}
