export interface FlagDescription {
  index: number;
  description: string;
  codeSample: CodeSample;
}

export interface CodeSample {
  code: string;
  fileName: string;
  lineNumber: number;
}

export type ParamDescription =
  | { type: "Integer"; description: string; codeSample: CodeSample }
  | { type: "Bit Flags"; flags: FlagDescription[] }
  | "Unused"
  | "Unknown";

export interface ItemParams {
  flags: string;
  p0: ParamDescription;
  p1: ParamDescription;
  p2: ParamDescription;
  p3: ParamDescription;
}
