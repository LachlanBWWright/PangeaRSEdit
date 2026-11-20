import type { EngineScene } from "./engineSchemas";

export type EngineTerrainTool = "select" | "raise" | "lower" | "flatten";
export function editEngineHeight(scene: EngineScene, x: number, z: number, tool: EngineTerrainTool, amount: number, radius: number): EngineScene {
  if (tool === "select" || ![x, z, amount, radius].every(Number.isFinite) || radius < 0) return scene;
  const terrain = scene.terrain;
  const centerX = Math.round(x / terrain.sizeX * (terrain.samplesX - 1));
  const centerZ = Math.round(z / terrain.sizeZ * (terrain.samplesZ - 1));
  let changed = false;
  const heights = terrain.heights.map((height, index) => {
    const dx = index % terrain.samplesX - centerX, dz = Math.floor(index / terrain.samplesX) - centerZ;
    if (dx * dx + dz * dz > radius * radius) return height;
    const value = Math.max(-1e7, Math.min(1e7, tool === "flatten" ? amount : height + (tool === "lower" ? -Math.abs(amount) : Math.abs(amount))));
    if (value !== height) changed = true;
    return value;
  });
  return changed ? { ...scene, terrain: { ...terrain, heights } } : scene;
}

export function engineHeightAt(scene: EngineScene, x: number, z: number) {
  return engineTerrainHeightAt(scene.terrain, x, z);
}
function engineTerrainHeightAt(t: EngineScene["terrain"], x: number, z: number) {
  const sx = Math.max(0, Math.min(t.samplesX - 1, x / t.sizeX * (t.samplesX - 1)));
  const sz = Math.max(0, Math.min(t.samplesZ - 1, z / t.sizeZ * (t.samplesZ - 1)));
  const ix = Math.min(t.samplesX - 2, Math.floor(sx)), iz = Math.min(t.samplesZ - 2, Math.floor(sz));
  const fx = sx - ix, fz = sz - iz;
  const a = t.heights[iz * t.samplesX + ix] ?? 0, b = t.heights[iz * t.samplesX + ix + 1] ?? 0;
  const c = t.heights[(iz + 1) * t.samplesX + ix] ?? 0, d = t.heights[(iz + 1) * t.samplesX + ix + 1] ?? 0;
  if (t.splits?.[iz * (t.samplesX - 1) + ix] === 1)
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  return fx >= fz ? a + (b - a) * fx + (d - b) * fz : a + (d - c) * fx + (c - a) * fz;
}

export function rasterizeEngineTerrain(canvas: HTMLCanvasElement, terrain: EngineScene["terrain"]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  let min = Infinity, max = -Infinity;
  for (const height of terrain.heights) { min = Math.min(min, height); max = Math.max(max, height); }
  const pixels = context.createImageData(canvas.width, canvas.height);
  for (let row = 0; row < canvas.height; row++) for (let column = 0; column < canvas.width; column++) {
    const height = engineTerrainHeightAt(terrain, column / (canvas.width - 1) * terrain.sizeX, row / (canvas.height - 1) * terrain.sizeZ);
    const brightness = max === min ? 0.5 : (height - min) / (max - min);
    const index = (row * canvas.width + column) * 4;
    pixels.data[index] = 35 + brightness * 75; pixels.data[index + 1] = 65 + brightness * 100;
    pixels.data[index + 2] = 68 + brightness * 75; pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
}

export function engineCanvasPoint(element: Element, clientX: number, clientY: number, scene: EngineScene) {
  const bounds = element.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * scene.terrain.sizeX,
    z: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)) * scene.terrain.sizeZ };
}
