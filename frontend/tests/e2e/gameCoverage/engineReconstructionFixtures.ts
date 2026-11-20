const helpers = `
local engine=require('engine')
local p=require('pangea')
local world=require('world.pangea')
local fonts=require('font_atlas')
assert(type(world.load)=='function' and type(fonts.load)=='function')
local function quad(x0,y0,x1,y1,z,materials)
  return {vertices={
    {x=x0,y=y0,z=z,u=0,v=0,uv2={x=1,y=0}},
    {x=x1,y=y0,z=z,u=1,v=0,uv2={x=0,y=0}},
    {x=x1,y=y1,z=z,u=1,v=1,uv2={x=0,y=1}},
    {x=x0,y=y1,z=z,u=0,v=1,uv2={x=1,y=1}},
  },indices={1,2,3,1,3,4},materials=materials}
end
local function spawn(spec)
  local model=engine.mesh(spec); assert(model.ok,model.message)
  local actor=p.spawn.scriptedResult(model.id,{x=0,y=0,z=0},{placement='world'})
  assert(actor.ok,actor.message); return model.id
end
local function setup()
  assert(engine.ui({widgets={}}).ok)
  assert(engine.environment({clear={r=0,g=0,b=0,a=1},lighting=false,fogEnabled=false}).ok)
  assert(engine.view(1,{position={x=0,y=0,z=10},target={x=0,y=0,z=0},
    up={x=0,y=1,z=0},orthographic=true,orthoHeight=6,near=.1,far=100}).ok)
end
`;

export const layeredGeometry = `${helpers}
local id
return {
 onLevelStart=function()
  setup()
  id=spawn(quad(-2,-2,2,2,0,{
    {r=1,g=0,b=0,a=1,unlit=true,blend='opaque'},
    {unlit=true,blend='add',clampU=true,clampV=true},
  }))
  assert(engine.texturePixels(id,2,{width=2,height=1,
    bytes=string.char(0,0,255,255,0,0,0,0)}).ok)
 end,
 onFrame=function()
  if engine.key('U') then assert(engine.meshMaterial(id,2,{offsetU=1}).ok) end
 end,
}`;

export const cutoutGeometry = `${helpers}
return {onLevelStart=function()
 setup()
 local front=spawn(quad(-2,-2,2,2,0,{{unlit=true,clampU=true,clampV=true}}))
 assert(engine.texturePixels(front,1,{width=2,height=1,
   bytes=string.char(0,0,255,255,0,0,255,0)}).ok)
 spawn(quad(-2,-2,2,2,-1,{{r=0,g=1,b=0,a=1,unlit=true,blend='opaque'}}))
end}`;

export const fourViews = `${helpers}
return {onLevelStart=function()
 setup()
 local up={{x=0,y=1,z=0},{x=1,y=0,z=0},{x=0,y=-1,z=0},{x=-1,y=0,z=0}}
 for i=1,4 do
  assert(engine.view(i,{position={x=0,y=0,z=10},target={x=0,y=0,z=0},up=up[i],
    enabled=true,orthographic=true,orthoHeight=6,near=.1,far=100,
    x=((i-1)%2)*.5,y=math.floor((i-1)/2)*.5,width=.5,height=.5}).ok)
 end
 spawn(quad(.7,-.3,1.3,.3,0,{{r=1,g=0,b=0,a=1,unlit=true,blend='opaque'}}))
 spawn(quad(-.3,.7,.3,1.3,0,{{r=0,g=0,b=1,a=1,unlit=true,blend='opaque'}}))
 local image=engine.image('cyan.tga'); assert(image.ok,image.message)
 assert(engine.presentation({referenceWidth=400,referenceHeight=300,scaleMode='stretch',nodes={
   {type='sprite',id='all-views',image=image.id,x=8,y=8,width=24,height=24,layer=1},
   {type='rectangle',id='only-second-view',view=2,x=48,y=8,width=24,height=24,
     color={r=1,g=1,b=0,a=1},layer=2},
 }}).ok)
end}`;

export function reconstructionPackage(source: string) {
  const encoder = new TextEncoder();
  const manifest = {
    version: 1, id: "pangea.render.acceptance", name: "Rendering acceptance", entry: "main.lua",
    tickRate: 60, initialScene: "scene",
    scenes: [{ id: "scene", name: "Rendering", file: "scene.json", controller: "main" }],
  };
  const scene = {
    version: 1,
    terrain: { samplesX: 2, samplesZ: 2, sizeX: 10, sizeZ: 10, chunkSize: 10, cellsPerChunk: 1, heights: [-1000, -1000, -1000, -1000] },
    colliders: [], assets: [], entities: [],
  };
  const text = [
    { path: "package.json", text: JSON.stringify(manifest) },
    { path: "scene.json", text: JSON.stringify(scene) },
    { path: "main.lua", text: source },
  ].map((file) => ({ path: file.path, bytes: [...encoder.encode(file.text)] }));
  return [...text, {
    path: "cyan.tga",
    bytes: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 24, 32, 255, 255, 0],
  }];
}
