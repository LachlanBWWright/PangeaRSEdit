import type { LuaValidationInput } from "./scriptLuaValidationTypes";
import { SCRIPT_API_VERSION, SCRIPT_CONTRACT_VERSION } from "./scriptContract";

function luaString(value: string): string {
  let separator = "=";
  while (value.includes(`]${separator}]`)) separator += "=";
  return `[${separator}[\n${value}]${separator}]`;
}

export function buildLuaValidationProgram(input: LuaValidationInput): string {
  const modules = input.modules.map(({ path, source }) =>
    `{path=${luaString(path)},source=${luaString(source)}}`,
  ).join(",\n");
  const behaviors = input.behaviors.map(({ modulePath, exportName }) =>
    `{path=${luaString(modulePath)},name=${luaString(exportName)}}`,
  ).join(",\n");
  return `
local modules = {${modules}}
local behaviors = {${behaviors}}
local diagnostics, compiled, loaded, loading = {}, {}, {}, {}
local currentPath = ""
local function message(value)
  return type(value) == "string" and value or "Module raised a non-string error"
end
local function report(path, phase, value)
  local text = message(value)
  local line = tonumber(string.match(text, ":(%d+):"))
  diagnostics[#diagnostics + 1] = {filePath=path, phase=phase, message=text, line=line}
end
local function guarded(name)
  return setmetatable({}, {
    __index=function(_, key) return guarded(name .. "." .. tostring(key)) end,
    __call=function() error("Native API calls are unavailable during module validation: " .. name, 2) end,
    __newindex=function() error("Native API mutation during module validation: " .. name, 2) end,
    __metatable=false,
  })
end
local pangeaApi = {
  apiVersion=${SCRIPT_API_VERSION}, version=${SCRIPT_API_VERSION},
  contractVersion=${SCRIPT_CONTRACT_VERSION}, minimumVersion=1,
  requireVersion=function(minimum, maximum)
    maximum = maximum or ${SCRIPT_API_VERSION}
    if type(minimum) ~= "number" or type(maximum) ~= "number" or
       minimum > ${SCRIPT_API_VERSION} or maximum < ${SCRIPT_API_VERSION} then
      error("Incompatible Pangea API version", 2)
    end
    return true
  end,
}
local pangea = guarded("pangea")
setmetatable(pangeaApi, {__index=function(_, key) return guarded("pangea.api." .. tostring(key)) end})
rawset(pangea, "api", pangeaApi)
math.random = nil
math.randomseed = nil
local safe = {
  assert=assert, error=error, ipairs=ipairs, next=next, pairs=pairs,
  pcall=pcall, xpcall=xpcall, select=select, tonumber=tonumber,
  tostring=tostring, type=type, rawequal=rawequal, rawget=rawget,
  rawset=rawset, setmetatable=setmetatable, getmetatable=getmetatable,
  math=math, string=string, table=table, utf8=utf8,
  print=function() end, warn=function() end,
  _VERSION=_VERSION, pangea=pangea, coroutine=guarded("coroutine"),
}
local function resolve(name)
  if type(name) ~= "string" or name == "" or string.find(name, "[^%w_./%-]") or
     string.find(name, "..", 1, true) or string.sub(name, 1, 1) == "/" then
    error("Invalid bundled module name", 2)
  end
  local relative = string.gsub(name, "%.", "/") .. ".lua"
  local path = "Data/Scripts/dist/modules/" .. relative
  if compiled[path] then return path end
  path = "Data/Scripts/dist/" .. relative
  if compiled[path] then return path end
  error("Bundled module not found: " .. name, 2)
end
local function evaluate(path)
  if loaded[path] ~= nil then return loaded[path] end
  if loading[path] then error("Cyclic module dependency: " .. path, 2) end
  local chunk = compiled[path]
  if not chunk then error("Bundled module not found: " .. path, 2) end
  loading[path] = true
  currentPath = path
  local result = chunk()
  loading[path] = nil
  if result == nil then result = true end
  loaded[path] = result
  return result
end
safe.require = function(name)
  if name == "pangea" then return pangea end
  return evaluate(resolve(name))
end
for _, item in ipairs(modules) do
  if compiled[item.path] then
    report(item.path, "module", "Duplicate bundled module path")
  else
    local env = setmetatable({}, {__index=safe})
    env._G = env
    local chunk, failure = load(item.source, "@" .. item.path, "t", env)
    if chunk then compiled[item.path] = chunk else report(item.path, "syntax", failure) end
  end
end
if #diagnostics > 0 then return {ok=false, diagnostics=diagnostics} end
local remaining = 200000
local function budget()
  remaining = remaining - 1000
  if remaining <= 0 then error("Module validation instruction budget exceeded", 0) end
end
debug.sethook(budget, "", 1000)
for _, item in ipairs(modules) do
  remaining = 200000
  currentPath = item.path
  local success, failure = pcall(evaluate, item.path)
  if not success then
    debug.sethook()
    report(currentPath, "module", failure)
    debug.sethook(budget, "", 1000)
  end
end
debug.sethook()
for _, behavior in ipairs(behaviors) do
  local result = loaded[behavior.path]
  local exported = type(result) == "table" and rawget(result, behavior.name)
  if type(exported) ~= "table" then
    report(behavior.path, "export", "Required behavior export must be a table: " .. behavior.name)
  else
    for key, value in next, exported do
      if type(key) == "string" and string.match(key, "^on[A-Z]") and type(value) ~= "function" then
        report(behavior.path, "export", "Behavior callback must be a function: " .. behavior.name .. "." .. key)
      end
    end
  end
end
if #diagnostics > 0 then return {ok=false, diagnostics=diagnostics} end
return {ok=true}
`;
}
