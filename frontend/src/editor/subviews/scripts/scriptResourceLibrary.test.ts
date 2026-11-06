// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Result } from "neverthrow";
import { expect, it } from "vitest";

const lua = process.env.PANGEA_LUA_EXECUTABLE;

it.skipIf(!lua)("prunes completed resources, emits distinct lifecycle notifications and preserves explicit ownership policy", () => {
  if (!lua) return;
  const read = Result.fromThrowable(() => readFileSync("../games/pangea-ports/shared/script/pangea_resources.lua", "utf8"), String)();
  expect(read.isErr() ? read.error : null).toBeNull();
  if (read.isErr()) return;
  const program = `
local timers, tasks, nextId, queued = {}, {}, 0, {}
local p={object={},time={},task={},log={warn=function() end}}
function p.object.exists(h) return h and not h.deleted end
function p.object.lifeState(h) return h.deleted and 'removed' or h.dead and 'dead' or 'alive' end
function p.object.position(h) return h and not h.deleted and {x=0,y=0,z=0} or nil end
function p.object.deleteResult(h) h.deleted=true; return {ok=true} end
function p.object.releaseOwnership(h) h.orphaned=true; return {ok=true} end
function p.object.hasControl(h,t) return false end
function p.time.every(s,callback) nextId=nextId+1; timers[nextId]=callback; return nextId,{ok=true} end
function p.time.isActive(id) return timers[id]~=nil end
function p.time.cancel(id) timers[id]=nil end
function p.task.start(callback) nextId=nextId+1; tasks[nextId]=callback; return nextId,{ok=true} end
function p.task.isActive(id) return tasks[id]~=nil end
function p.task.cancel(id) tasks[id]=nil end
package.preload.pangea=function() return p end
local resources=(function(...) ${read.value} end)(function() return nil end,
  function() local batch=queued; queued={}; return batch end,
  function(_,callback,...) return callback(...) end)
local invalidMovement=resources.move(nil,{},0)
assert(not invalidMovement.ok and #invalidMovement.contacts==0)
assert(not resources.create('bad options'))
local group=assert(resources.create())
for i=1,600 do
  local actor={id=i,generation=1}
  assert(group:track(actor).ok)
  actor.deleted=true
  local timer=assert(group:every(0.1,function() end)); p.time.cancel(timer)
  local task=assert(group:task(function() end)); p.task.cancel(task)
end
local actor={id=1000,generation=1}
local death,removed=0,0
assert(group:track(actor).ok)
assert(group:watch(actor,{onDeath=function() death=death+1 end,onRemoved=function() removed=removed+1 end}).ok)
actor.dead=true
queued={{object=actor,death=true,reason='killed'}}
resources._update()
assert(death==1 and removed==0)
actor.deleted=true
queued={{object=actor,death=false,reason='killed'}}
resources._update()
resources._update()
assert(death==1 and removed==1)
assert(group:clear().ok and next(timers)==nil and next(tasks)==nil)
local sequence=assert(resources.create())
local proceeded=false
local completed
local task=assert(sequence:sequence({
  function() return {ok=true,blocked=true} end,
  function() proceeded=true; return {ok=true} end,
},function(outcome) completed=outcome end))
tasks[task]()
assert(not proceeded and completed.blocked, 'blocked movement must stop subsequent sequence steps')
assert(sequence:clear().ok)
local retained={id=1001,generation=1}
local keep=assert(resources.create({keepOnOwnerDestroy=true}))
assert(keep:track(retained).ok and retained.orphaned)
assert(keep:clear('owner-destroy').ok and not retained.deleted)
`;
  const executed = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: program, encoding: "utf8" }), String)();
  expect(executed.isErr() ? executed.error : executed.value).toBe("");
});
