import type { ParamDescription } from "../../../data/items/itemParams";

export function getParamTooltip(param: ParamDescription | string): string {
  if (param === "Unknown" || param === "Unused") return "";
  if (typeof param === "string") return param;
  if (param && param.type === "Integer") {
    let t = param.description;
    t += `\nExample: ${param.defaultCitation.code}`;
    return t;
  }
  if (param && param.type === "Bit Flags" && Array.isArray(param.flags)) {
    const fmt = (f: (typeof param.flags)[number]) =>
      `${f.index}: ${f.description}` +
      (f.defaultCitation.code ? `\nExample: ${f.defaultCitation.code}` : "");
    return param.flags.map(fmt).join("\n\n");
  }
  return "";
}
