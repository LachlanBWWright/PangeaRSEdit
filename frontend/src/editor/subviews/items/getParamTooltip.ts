import type { ParamDescription } from "../../../data/items/itemParams";

export function getParamTooltip(param: ParamDescription | string): string {
  if (param === "Unknown" || param === "Unused") return "";
  if (typeof param === "string") return param;
  if (param && param.type === "Integer") {
    let t = param.description;
    if (param.codeSample) t += `\nExample: ${param.codeSample.code}`;
    return t;
  }
  if (param && param.type === "Bit Flags" && Array.isArray(param.flags)) {
    return param.flags
      .map(
        (f) =>
          `${f.index}: ${f.description}` +
          (f.codeSample ? `\nExample: ${f.codeSample.code}` : ""),
      )
      .join("\n\n");
  }
  return "";
}
