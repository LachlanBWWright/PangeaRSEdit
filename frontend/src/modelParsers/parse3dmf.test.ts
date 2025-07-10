import { parse3DMF } from "./parse3dmf";

describe("parse3DMF", () => {
  it("should throw not implemented", () => {
    expect(() => parse3DMF(new ArrayBuffer(0))).toThrow("not yet implemented");
  });
});
