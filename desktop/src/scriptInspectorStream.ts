import { Result } from "neverthrow";
import { scriptInspectorSchema, type ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import { z } from "zod";

function inspectorLineLimit(text: string): number {
  if (text.startsWith("[PangeaInspectorPage] ")) return 1048576 + 256;
  if (text.startsWith("[PangeaInspectorState] ")) return 270000;
  return 262144;
}

export class ScriptInspectorStream {
  private pending = "";
  constructor(private readonly receive: (snapshot: ScriptInspectorSnapshot) => void, private readonly receivePage: (sequence: number, page: unknown) => void = () => undefined) {}
  public feed(text: string): string {
    this.pending += text;
    let output = "";
    let newline = this.pending.indexOf("\n");
    while (newline >= 0) {
      const line = this.pending.slice(0, newline);
      this.pending = this.pending.slice(newline + 1);
      if (!this.inspect(line)) output += `${line}\n`;
      newline = this.pending.indexOf("\n");
    }
    const prefixes = ["[PangeaInspector] ", "[PangeaInspectorPage] ", "[PangeaInspectorState] "];
    if (this.pending && !prefixes.some((prefix) => prefix.startsWith(this.pending) || this.pending.startsWith(prefix))) {
      output += this.pending;
      this.pending = "";
    }
    const limit = inspectorLineLimit(this.pending);
    if (this.pending.length > limit) { output += this.pending; this.pending = ""; }
    return output;
  }
  public finish(): string { const last = this.pending; this.pending = ""; return last; }
  private inspect(line: string): boolean {
    const pagePrefix = ["[PangeaInspectorPage] ", "[PangeaInspectorState] "].find((prefix) => line.startsWith(prefix));
    if (pagePrefix && line.length <= inspectorLineLimit(line)) {
      const json = Result.fromThrowable((): unknown => JSON.parse(line.slice(pagePrefix.length)), () => null)();
      if (json.isErr()) return false;
      const parsed = z.object({ sequence: z.number().int().positive(), page: z.unknown() }).safeParse(json.value);
      if (!parsed.success) return false;
      this.receivePage(parsed.data.sequence, parsed.data.page);
      return true;
    }
    const prefix = "[PangeaInspector] ";
    if (!line.startsWith(prefix) || line.length > 262144) return false;
    const json = Result.fromThrowable((): unknown => JSON.parse(line.slice(prefix.length)), () => null)();
    if (json.isErr()) return false;
    const parsed = scriptInspectorSchema.safeParse(json.value);
    if (!parsed.success) return false;
    this.receive(parsed.data);
    return true;
  }
}
