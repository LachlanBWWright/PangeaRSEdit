export type FlagDescription = {
  index: number;
  description: string;
};

type CodeSample = {
  code: string;
  fileName: string;
  lineNumber: number;
};

export type ParamDescription =
  | { type: "Integer"; description: string }
  | { type: "Bit Flags"; flags: FlagDescription[] }
  | "Unused"
  | "Unknown";

export type ItemParams = {
  flags: string;
  p0: ParamDescription;
  p1: ParamDescription;
  p2: ParamDescription;
  p3: ParamDescription;
};
