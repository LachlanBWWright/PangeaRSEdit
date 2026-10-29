import { describe, expect, it } from "vitest";
import { err, ok } from "neverthrow";
import { readRuntimeSource } from "../../scripts/readRuntimeSource";

function sourceReader(files: ReadonlyMap<string, string>) {
  return (path: string) => {
    const source = files.get(path);
    return source === undefined ? err(`Missing source: ${path}`) : ok(source);
  };
}

describe("runtime implementation includes", () => {
  it("finds native dispatch in nested implementation files", () => {
    const files = new Map([
      ["/game/ScriptBindings.c", '#include "Custom.inc"'],
      ["/game/Custom.inc", '#include "nested/Trigger.inc"'],
      ["/game/nested/Trigger.inc", "PangeaScript_CallObjectTriggerWithOther();"],
    ]);
    const source = readRuntimeSource("/game/ScriptBindings.c", sourceReader(files));
    expect(source.isOk() && source.value.includes("PangeaScript_CallObjectTriggerWithOther")).toBe(true);
  });

  it("bounds repeated and cyclic implementation includes", () => {
    const files = new Map([
      ["/game/ScriptBindings.c", '#include "Custom.inc"\n#include "Custom.inc"'],
      ["/game/Custom.inc", '#include "Custom.inc"\nnativeDispatch();'],
    ]);
    const source = readRuntimeSource("/game/ScriptBindings.c", sourceReader(files));
    expect(source.isOk() && source.value.match(/nativeDispatch/g)?.length).toBe(1);
  });

  it("rejects missing implementation files", () => {
    const files = new Map([["/game/ScriptBindings.c", '#include "Missing.inc"']]);
    expect(readRuntimeSource("/game/ScriptBindings.c", sourceReader(files)).isErr()).toBe(true);
  });

  it("does not read commented or quoted include examples", () => {
    const files = new Map([["/game/ScriptBindings.c",
      '// #include "Missing.inc"\nconst char* example = "#include \\"Missing.inc\\"";']]);
    expect(readRuntimeSource("/game/ScriptBindings.c", sourceReader(files)).isOk()).toBe(true);
  });
});
