local engine = {objects={}, players={}, saved={}, hud={}, nextId=0, opacityCalls=0, rayClear=true, nativeSpawns=0}
local p = {object={}, player={}, spawn={}, world={}, ui={}, persistence={}, log={}, resources={}, input={},level={},combat={}}
local levelState,subscriptions={},{}
function p.level.state() return levelState end
engine.api = p
engine.players[0] = {object={id=0,generation=1},position={x=10000,y=100,z=10000}, rotation={x=0,y=0,z=0}, health=1, dead=false}

local function result() return {ok=true} end
local function object(handle) return handle and engine.objects[handle.id] end
local function spawn(id, position, native)
  engine.nextId = engine.nextId+1
  local handle = {id=engine.nextId, generation=1}
  engine.objects[handle.id] = {handle=handle, id=id, position={x=position.x,y=position.y,z=position.z},
    state={}, health=3, native=native, deleted=false, controlled=false}
  if native then engine.nativeSpawns = engine.nativeSpawns+1 end
  return {ok=true, primary=handle}
end
function p.spawn.nativeResult(id, point) return spawn(id, point, true) end
function p.spawn.scriptedResult(id, point) return spawn(id, point, false) end
function p.object.exists(h) return object(h) and not object(h).deleted end
function p.object.position(h) return p.object.exists(h) and object(h).position or nil end
function p.object.state(h) return object(h).state end
function p.object.lifeState(h)
  if not p.object.exists(h) then return "removed" end
  return object(h).health <= 0 and "dead" or "alive"
end
function p.object.deleteResult(h) object(h).deleted=true; return result() end
function p.object.setPositionResult(h, point) object(h).position=point; return result() end
function p.object.setScaleResult() return result() end
function p.object.setVelocityResult() return result() end
function p.object.setDamageResult() return result() end
function p.object.bounds() return {min={x=0,y=0,z=0},max={x=1,y=1,z=1}} end
function p.object.health(h) return object(h).health end
function p.object.setHealthResult(h, health) object(h).health=health; return result() end
function p.combat.apply(h,damage)
  local before=object(h).health
  object(h).health=math.max(0,before-damage)
  return {ok=true,appliedDamage=before-object(h).health,dead=object(h).health==0}
end
function p.object.setOpacityResult() engine.opacityCalls=engine.opacityCalls+1; return result() end
function p.object.moveKinematic(h, delta)
  local point=object(h).position
  point={x=point.x+delta.x,y=point.y+delta.y,z=point.z+delta.z}
  object(h).position=point
  return {ok=true, completed=true, blocked=false, position=point, contacts={}}
end
function p.player.get(index) return engine.players[index] end
function p.player.count() return engine.players[2] and 3 or engine.players[1] and 2 or 1 end
function p.player.list(options)
  local players={}
  for index=0,p.player.count()-1 do
    if options.kind~="localHuman" or index<2 then
      engine.players[index].playerNum=index
      players[#players+1]=engine.players[index]
    end
  end
  return players
end
function p.input.get(index) return index < 2 and {} or nil end
function p.player.relations() return {form=engine.form or "bug", carried=engine.carried} end
function p.player.setPositionResult(index, point) engine.players[index].position=point; return result() end
function p.world.sampleTerrain() return {height=0, normal={x=0,y=1,z=0}} end
function p.world.sampleTile() return {solid=false} end
function p.world.overlapBox() return engine.touchingAlarm and {engine.players[0].object} or {}, result() end
function p.world.raycast()
  if not engine.rayClear then return {surface="fence"}, result() end
  return nil, result()
end
function p.world.sweepBox() return nil,result() end
function p.persistence.get(key) return engine.saved[key] end
function p.persistence.set(key, _, value) engine.saved[key]=value; return true end
function p.ui.objective(id, options)
  engine.hud[id]=options
  return {ok=true, handle={id=id}}
end
function p.ui.remove(handle) engine.hud[handle.id]=nil; return result() end
function p.ui.message() return result() end
function p.log.warn(message) engine.warning=message end
function p.resources.create()
  local group={objects={}, closed=false,hudHandles={}}
  function group:hud(handle) self.hudHandles[#self.hudHandles+1]=handle; return result() end
  function group:on(event,callback) subscriptions[#subscriptions+1]={group=self,event=event,callback=callback}; return #subscriptions,result() end
  function group:track(h) self.objects[#self.objects+1]=h; return result() end
  function group:control(h) object(h).controlled=true; return result() end
  function group:clear()
    for _, h in ipairs(self.objects) do p.object.deleteResult(h) end
    for _, h in ipairs(self.hudHandles) do p.ui.remove(h) end
    self.closed=true
  end
  return group
end
function engine.find(id)
  local found={}
  for _, value in pairs(engine.objects) do
    if value.id==id and not value.deleted then found[#found+1]=value end
  end
  table.sort(found,function(a,b) return a.handle.id<b.handle.id end)
  return found
end
function engine.root(id)
  if levelState.sample==id then return {state=levelState} end
end
function engine.killNatives()
  for _, value in pairs(engine.objects) do if value.native then value.health=0 end end
end
function engine.step(entry, frames)
  local callback=entry.onFrame or entry.onAreaFrame or entry.onRaceFrame
  for _=1,frames or 1 do
    if engine.carried~=engine.previousCarried then
      for _,subscription in ipairs(subscriptions) do
        if not subscription.group.closed and subscription.event=="player.carried" and engine.carried then
          subscription.callback({playerNum=0,object=engine.carried})
        end
      end
      engine.previousCarried=engine.carried
    end
    callback({deltaSeconds=0.1})
  end
  assert(not engine.warning, engine.warning)
end
package.preload.pangea=function() return p end
return engine
