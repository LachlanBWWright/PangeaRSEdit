import { describe, expect, it } from "vitest";
import { buildNativeIdSnippet, getContextualApiName, nativeIdInsertText } from "./scriptCompletionText";

describe("Lua completion insertion text", () => {
  it("uses the member name when completing a partially typed namespace member", () => {
    expect(getContextualApiName("pangea.object.setPos", "pangea.object.setPosition")).toBe("setPosition");
    expect(getContextualApiName("pangea.ob", "pangea.object.setPosition")).toBe("object.setPosition");
    expect(getContextualApiName("pangea.object.", "pangea.object.setPosition")).toBe("setPosition");
    expect(getContextualApiName("local x = ", "pangea.object.setPosition")).toBe("pangea.object.setPosition");
  });

  it("keeps numeric spawn IDs numeric and quotes escaped symbolic IDs", () => {
    expect(nativeIdInsertText("42")).toBe("42");
    expect(nativeIdInsertText("042")).toBe('"042"');
    expect(nativeIdInsertText('object."name')).toBe('"object.\\"name"');
    expect(buildNativeIdSnippet(["42", "object.name"])).toBe('${1|42,"object.name"|}');
  });
});
