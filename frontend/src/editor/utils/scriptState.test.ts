import { describe, expect, it, vi } from "vitest";
import { encodeScriptStatePath } from "@pangea/desktop-contracts";
import { queryScriptState } from "./scriptState";

const query = { handle: { id: 9, generation: 4 }, path: ["a/b", 1, "é"], offset: 32 };
const page = { entries: [{ key: "nested", type: "table", value: "table", expandable: true, cycle: false, truncated: false }], offset: 32, nextOffset: 64, total: 100, truncated: true, error: null };
describe("nested state queries", () => {
  it("encodes key types and delimiters without evaluating expressions", () => {
    expect(encodeScriptStatePath(query.path)).toBe("s612f62/n1/sc3a9");
    expect(encodeScriptStatePath(["1", 1, "", "\n"])).toBe("s31/n1/s/s0a");
    const ccall = vi.fn(() => JSON.stringify(page));
    expect(queryScriptState({ ccall }, query).isOk()).toBe(true);
    expect(ccall).toHaveBeenCalledWith("PangeaScript_GetObjectStateInspectorJSON", "string", ["number", "number", "string", "number", "number"], [9, 4, "s612f62/n1/sc3a9", 32, 32]);
  });
  it("rejects stale objects, malformed responses and nonadvancing pages", () => {
    for (const response of ["bad json", JSON.stringify({ ...page, error: "Object handle is stale" }), JSON.stringify({ ...page, nextOffset: 32 }), JSON.stringify({ ...page, entries: [{ key: {}, type: "table" }] })]) {
      expect(queryScriptState({ ccall: () => response }, query).isErr()).toBe(true);
    }
  });
  it("validates paths before crossing the native boundary", () => {
    const ccall = vi.fn();
    expect(queryScriptState({ ccall }, { ...query, path: Array.from({ length: 17 }, () => "x") }).isErr()).toBe(true);
    expect(ccall).not.toHaveBeenCalled();
  });
});
