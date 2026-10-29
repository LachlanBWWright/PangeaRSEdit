import { expect, it } from "vitest";
import { gameConsoleSource } from "./gameConsoleSource";

it.each([
  "Data/Scripts/dist/modules/helpers/example.lua:12: failed",
  '\t[string "Data/Scripts/dist/modules/helpers/example.lua"]:12: failed',
  "C:\\runs\\Data\\Scripts\\dist\\modules\\helpers\\example.lua:12: failed",
])("maps native Lua tracebacks to the editable project source", (line) => {
  expect(gameConsoleSource(line)).toEqual({ path: "Data/Scripts/src/helpers/example.lua", line: 12 });
});
it.each(["Data/Scripts/src/../outside.lua:3: bad", "https://example.com/file.lua:1: bad", "Data/Scripts/src/file.lua:0: bad", "normal output"])("does not open unsafe or unrelated output", (line) => {
  expect(gameConsoleSource(line)).toBeNull();
});
