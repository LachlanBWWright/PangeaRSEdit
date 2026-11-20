import { err, ok } from "neverthrow";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { engineSceneSchema } from "./engineSchemas";
import { validateEnginePackage, type EnginePackage } from "./enginePackage";

const controller = `local p=require('pangea')
local engine=require('engine')
local actor,speed,distance
return {
  onLevelStart=function()
    local t=engine.terrainInfo()
    local extent=math.max(t.sizeX,t.sizeZ)
    local half=math.max(1,extent*.002)
    local x,z=t.sizeX/2,t.sizeZ/2
    local result=p.spawn.scriptedResult('box',{x=x,y=(engine.height(x,z) or 0)+half*3,z=z},{placement='world'})
    assert(result.ok,result.message); actor=result.primary
    assert(engine.body(actor,{mode='dynamic',halfExtents={x=half,y=half*2,z=half},gravity=-half*40}).ok)
    speed=extent*.12; distance=math.min(20000,extent*.5)
    assert(engine.ui({title='Terrain test',widgets={{id='hint',type='text',text='WASD moves. This package contains terrain only; author gameplay in Lua.'}}}).ok)
  end,
  onFrame=function()
    local v=p.object.velocity(actor)
    v.x=((engine.key('D') and 1 or 0)-(engine.key('A') and 1 or 0))*speed
    v.z=((engine.key('S') and 1 or 0)-(engine.key('W') and 1 or 0))*speed
    assert(p.object.setVelocityResult(actor,v).ok)
    local at=p.object.position(actor)
    assert(engine.camera({x=at.x+distance,y=at.y+distance,z=at.z+distance},at).ok)
  end,
}
`;

export function createEngineTerrainPackage(headerData: HeaderData, terrainData: TerrainData, globals: GlobalsInterface, filename: string) {
  const header = headerData.Hedr[1000].obj;
  const source = terrainData.YCrd[1000]?.obj;
  if (!source || header.tileSize <= 0 || globals.TILE_INGAME_SIZE <= 0) return err("This level has no supported heightfield to export.");
  const scale = globals.TILE_INGAME_SIZE / header.tileSize;
  const sizeX = header.mapWidth * globals.TILE_INGAME_SIZE, sizeZ = header.mapHeight * globals.TILE_INGAME_SIZE;
  const parsed = engineSceneSchema.safeParse({ version: 1, terrain: { samplesX: header.mapWidth + 1, samplesZ: header.mapHeight + 1,
    sizeX, sizeZ, chunkSize: Math.max(sizeX, sizeZ) / 16, cellsPerChunk: 16, heights: source.map((height) => height * scale) }, colliders: [], assets: [] });
  if (!parsed.success || source.length !== (header.mapWidth + 1) * (header.mapHeight + 1)) return err("The heightfield dimensions or height values exceed the Lua engine's limits.");
  const manifest = { version: 1, id: "pangea.terrain-test", name: filename.slice(0, 100) + " terrain", entry: "main.lua", tickRate: 60, initialScene: "terrain",
    scenes: [{ id: "terrain", name: "Imported terrain", file: "scenes/terrain.json", controller: "scenes.terrain" }] };
  const files = { "package.json": JSON.stringify(manifest, null, 2), "main.lua": "return require('scenes.terrain')\n", "scenes/terrain.lua": controller,
    "scenes/terrain.json": JSON.stringify(parsed.data), "README.txt": "Terrain-only conversion. Heightfield dimensions and world heights are preserved. Textures, items, water, fences and source-game scripts are not converted.\n" };
  const packageData: EnginePackage = { files: Object.entries(files).map(([path, text]) => ({ path, bytes: new TextEncoder().encode(text) })) };
  const sceneFile = packageData.files.find((file) => file.path === "scenes/terrain.json");
  if (sceneFile && sceneFile.bytes.length > 4 * 1024 * 1024) return err("The exported scene exceeds the engine's 4 MiB scene-file limit.");
  return validateEnginePackage(packageData).andThen(() => ok(packageData));
}
