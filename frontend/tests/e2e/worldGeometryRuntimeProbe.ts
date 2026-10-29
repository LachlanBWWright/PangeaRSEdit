export const worldGeometryRuntimeProbe = `
local function probeWorldGeometry(ctx)
  local categories = {}
  for _, category in ipairs(pangea.world.categories()) do categories[category] = true end
  assert(categories.world and categories.terrain, "native world surfaces are not advertised")
  local player = pangea.player.get(0)
  if not player then return end
  if ctx.gameId == "CroMagRally-Android" then
    for _, id in ipairs({"26", "27"}) do
      local result = pangea.spawn.nativeResult(id, player.position)
      if ctx.mode == "capture" then
        assert(result.ok and result.primary, "capture objectives must create a live object")
        assert(pangea.object.delete(result.primary), "capture objective cleanup failed")
      else
        assert(not result.ok and result.reason == "incompatible-item", "capture objectives must reject other modes")
        pangea.log.info("browser expected native rejection " .. id)
      end
    end
  end
  local invalidHit, invalidStatus = pangea.world.raycast(player.position, player.position, "invalid-query-category")
  assert(not invalidHit and invalidStatus and not invalidStatus.ok and invalidStatus.reason == "bad-argument", "invalid queries must report a structured failure")
  if ctx.gameId == "MightyMike-Android" then
    local x = math.floor(player.position.x / 32) * 32
    local y = math.floor(player.position.y / 32) * 32
    for row = -4, 4 do
      for col = -4, 4 do
        local left, top = x + col * 32, y + row * 32
        local tile = pangea.world.sampleTile(left + 16, top + 16)
        if tile and tile.flags & 1 ~= 0 then
          local hit, status = pangea.world.raycast({x=left+16,y=top-1,z=0},{x=left+16,y=top+1,z=0},"terrain")
          assert(status and status.ok, "native tile edge query status failed")
          assert(hit and hit.surface == "terrain" and not hit.object, "native tile edge query failed")
          pangea.log.info("browser world geometry verified")
          return
        end
      end
    end
    pangea.log.info("browser world geometry has no nearby top-solid tiles")
    return
  end
  local position = player.position
  local sample = pangea.world.sampleTerrain(position.x, position.z)
  if not sample then
    pangea.log.info("browser world geometry unavailable in this mode")
    return
  end
  local from = {x=position.x,y=sample.height+100,z=position.z}
  local to = {x=position.x,y=sample.height-100,z=position.z}
  local hit, status = pangea.world.raycast(from,to,"terrain")
  assert(status and status.ok, "native terrain query status failed")
  assert(hit and hit.surface == "terrain" and not hit.object, "native terrain query failed")
  assert(hit.fraction >= 0 and hit.fraction <= 1 and hit.normal.y >= 0, "native terrain contact is invalid")
  local clearFrom = {x=position.x,y=sample.height+200,z=position.z}
  local clearTo = {x=position.x,y=sample.height+201,z=position.z}
  local clearHit, clearStatus = pangea.world.raycast(clearFrom,clearTo,"terrain")
  assert(not clearHit and clearStatus and clearStatus.ok, "clear space must be distinct from query failure")
  pangea.log.info("browser world geometry verified")
end
`;
