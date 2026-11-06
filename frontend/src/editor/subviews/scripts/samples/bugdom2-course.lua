local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("bugdom2-course")
local settings = {period=6, travel=220, checkpoints=3}
local platforms, marks, origins, elapsed, running, progress = {}, {}, {}, 0, false, 0
local switch, resume, anchor
local savedKey = "sample.bugdom2-course.checkpoint"

local function reset()
  session:clear()
  platforms, marks, origins, elapsed, running, switch = {}, {}, {}, 0, false, nil
end

local function planCourse(origin)
  for _,offset in ipairs({0,160,-160,320,-320}) do
    local points={}
    for index=1,settings.checkpoints do
      local player=p.player.get(0)
      local placement=p.spatial.findGround({helpers.offset(origin,350+index*300,0,offset)},
        {halfExtents={x=120,y=20,z=60},elevation=180,minNormalY=0,maxHeightDifference=500,
          ignore=player and player.object})
      local point=placement.ok and placement.position or nil
      if not point then p.level.state().placementReason=placement.reason; break end
      point.y=point.y+20
      points[#points+1]=point
    end
    if #points==settings.checkpoints then return points end
  end
end

local function initialize(player)
  progress = p.persistence.get(savedKey, 1) or 0
  local origin = anchor or helpers.ground(player.position)
  if not origin then session:fail("Course needs dry ground"); return end
  anchor = origin
  switch = helpers.offset(origin, 200, 100, 0)
  session:spawn("marker", switch)
  local points=planCourse(origin)
  if not points then session:fail("No clear, dry platform corridor nearby"); return end
  for index,point in ipairs(points) do
    local platform = session:spawn("platform", point)
    if not platform then return end
    if not session.group:control(platform).ok then session:fail("Platform controller unavailable"); return end
    platforms[index], origins[index] = platform, point
    marks[index] = session:spawn("marker", helpers.offset(point, 0, 160, 0))
  end
  session:objective("Touch the start marker, then ride to each checkpoint", progress, settings.checkpoints)
end

function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then initialize(player) end
  if session.failed or not switch then return end
  if resume and origins[progress] then
    local result = p.player.setPositionResult(0, helpers.offset(origins[progress], 0, 150, 0))
    if not result.ok then session:fail(result.message); return end
    resume, running = false, true
  end
  if not running then
    if helpers.distance(player.position, switch) > 220 then return end
    running = true
  end
  elapsed = elapsed + math.min(ctx.deltaSeconds, 0.1)
  for index, handle in ipairs(platforms) do
    local offset = math.sin(elapsed*math.pi*2/settings.period)*settings.travel
    local destination = helpers.offset(origins[index], 0, 0, offset)
    session:move(handle, destination)
    local actual = p.object.position(handle)
    if actual and marks[index] then p.object.setPositionResult(marks[index], helpers.offset(actual, 0, 160, 0)) end
    if index == progress+1 and actual and helpers.distance(player.position, helpers.offset(actual, 0, 100, 0)) < 200 then
      progress = index
      p.persistence.set(savedKey, 1, progress)
      session:objective("Platform checkpoints", progress, settings.checkpoints)
    end
  end
  session:status(progress == settings.checkpoints and "complete" or "running", progress)
end

function entry.onPlayerRespawn() reset(); resume = true end
function entry.onLevelStart() reset(); resume, anchor = false, nil end
function entry.onCheckpointReached() p.persistence.set(savedKey, 1, progress) end
function entry.onLevelUnload() reset(); anchor = nil end
return entry
