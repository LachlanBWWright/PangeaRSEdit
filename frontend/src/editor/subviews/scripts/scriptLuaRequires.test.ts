import { describe, expect, it } from "vitest";
import { collectLiteralLuaRequires } from "./scriptLuaRequires";

describe("Lua dependency collection", () => {
  it("ignores comments, quoted strings, long strings and member functions", () => {
    const source = `
-- require("comment")
--[==[ require("longComment") ]=] still a comment ]==]
local example = "require('quoted')"
local escaped = 'can\\'t require("escaped")'
local long = [=[ require("longString") ]=]
object.require("member")
object:require("method")
local _require = function() end
_require("other")
return require("actual")
`;
    expect(collectLiteralLuaRequires(source)._unsafeUnwrap()).toEqual(["actual"]);
  });

  it("collects transitive-call literals with comments, Lua sugar and long-bracket strings", () => {
    const source = `
require -- inline comment
  ( --[=[ block comment ]=] 'helpers.first' )
require "helpers.second"
require [==[
helpers.third]==]
require("helpers.first")
local example = "."; require("helpers.fourth")
require("(" )
`;
    expect(collectLiteralLuaRequires(source)._unsafeUnwrap()).toEqual(["helpers.first", "helpers.second", "helpers.third", "helpers.fourth", "("]);
  });

  it("decodes Lua escapes in module names", () => {
    const source = String.raw`require("helpers\x2eone"); require('helpers\046two'); require("helpers\u{2e}three"); require("helpers.\z
      four")`;
    expect(collectLiteralLuaRequires(source)._unsafeUnwrap()).toEqual(["helpers.one", "helpers.two", "helpers.three", "helpers.four"]);
  });

  it("leaves computed dependencies for full-package export and runtime validation", () => {
    expect(collectLiteralLuaRequires('require("helpers." .. name); require(name); require(dynamic())')._unsafeUnwrap()).toEqual([]);
  });

  it.each([String.raw`require("bad\q")`, 'require("unfinished', 'require [=[unfinished'])("reports an invalid literal dependency: %s", (source) => {
    expect(collectLiteralLuaRequires(source).isErr()).toBe(true);
  });

  it("ignores unfinished comments and strings as dependency examples in source drafts", () => {
    expect(collectLiteralLuaRequires('--[=[ require("missing")')._unsafeUnwrap()).toEqual([]);
    expect(collectLiteralLuaRequires('local draft = "require(\'missing\')')._unsafeUnwrap()).toEqual([]);
  });
});
