import { getGitHubPermalink } from "@/validation/gameRepositories";

export interface CodeSample {
  code: string;
  fileName: string;
  lineNumber: number;
  endLineNumber?: number;
}

export interface Citation {
  label: string;
  url: string;
  fileName: string;
  lineNumber: number;
  endLineNumber?: number;
  code: string;
}

export interface FlagDescriptionSource {
  index: number;
  description: string;
  codeSample: CodeSample;
  additionalCodeSamples?: CodeSample[];
}

export interface FlagDescription {
  index: number;
  description: string;
  defaultCitation: Citation;
  additionalCitations?: Citation[];
}

export type ParamDescriptionSource =
  | {
      type: "Integer";
      description: string;
      codeSample: CodeSample;
      additionalCodeSamples?: CodeSample[];
    }
  | {
      type: "Bit Flags";
      flags: FlagDescriptionSource[];
    }
  | "Unused"
  | "Unknown";

export type ParamDescription =
  | {
      type: "Integer";
      description: string;
      defaultCitation: Citation;
      additionalCitations?: Citation[];
    }
  | {
      type: "Bit Flags";
      flags: FlagDescription[];
      defaultCitation: Citation;
      additionalCitations?: Citation[];
    }
  | "Unused"
  | "Unknown";

export interface ItemParamsSource {
  flags: string;
  p0: ParamDescriptionSource;
  p1: ParamDescriptionSource;
  p2: ParamDescriptionSource;
  p3: ParamDescriptionSource;
}

export interface ItemParams {
  flags: string;
  p0: ParamDescription;
  p1: ParamDescription;
  p2: ParamDescription;
  p3: ParamDescription;
}

function toCitation(game: string, label: string, codeSample: CodeSample): Citation {
  return {
    label,
    url: getGitHubPermalink(game, codeSample.fileName, codeSample.lineNumber) ?? "",
    fileName: codeSample.fileName,
    lineNumber: codeSample.lineNumber,
    endLineNumber: codeSample.endLineNumber,
    code: codeSample.code,
  };
}

function toAdditionalCitations(
  game: string,
  label: string,
  codeSamples: CodeSample[] | undefined,
): Citation[] | undefined {
  if (!codeSamples || codeSamples.length === 0) {
    return undefined;
  }
  return codeSamples.map((codeSample) => toCitation(game, label, codeSample));
}

function normalizeFlagDescription(
  game: string,
  flag: FlagDescriptionSource,
): FlagDescription {
  return {
    index: flag.index,
    description: flag.description,
    defaultCitation: toCitation(game, flag.description, flag.codeSample),
    additionalCitations: toAdditionalCitations(
      game,
      flag.description,
      flag.additionalCodeSamples,
    ),
  };
}

function normalizeParamDescription(
  game: string,
  param: ParamDescriptionSource,
): ParamDescription {
  if (param === "Unused" || param === "Unknown") {
    return param;
  }

  if (param.type === "Integer") {
    return {
      type: "Integer",
      description: param.description,
      defaultCitation: toCitation(game, param.description, param.codeSample),
      additionalCitations: toAdditionalCitations(
        game,
        param.description,
        param.additionalCodeSamples,
      ),
    };
  }

  const flags = param.flags.map((flag) => normalizeFlagDescription(game, flag));
  const defaultFlagCitation = flags[0]?.defaultCitation;

  if (!defaultFlagCitation) {
    return "Unknown";
  }

  return {
    type: "Bit Flags",
    flags,
    defaultCitation: defaultFlagCitation,
    additionalCitations: [
      ...flags.flatMap((flag) => flag.additionalCitations ?? []),
      ...flags.slice(1).map((flag) => flag.defaultCitation),
    ],
  };
}

export function defineItemParams(
  game: string,
  params: Record<number, ItemParamsSource>,
): Record<number, ItemParams>;
export function defineItemParams(
  game: string,
  params: Partial<Record<number, ItemParamsSource>>,
): Partial<Record<number, ItemParams>>;
export function defineItemParams(
  game: string,
  params: Record<number, ItemParamsSource> | Partial<Record<number, ItemParamsSource>>,
): Record<number, ItemParams> | Partial<Record<number, ItemParams>> {
  const normalizedParams: Record<number, ItemParams> = {};

  for (const [key, itemParams] of Object.entries(params)) {
    const itemType = Number.parseInt(key, 10);
    if (Number.isNaN(itemType) || !itemParams) {
      continue;
    }

    normalizedParams[itemType] = {
      flags: itemParams.flags,
      p0: normalizeParamDescription(game, itemParams.p0),
      p1: normalizeParamDescription(game, itemParams.p1),
      p2: normalizeParamDescription(game, itemParams.p2),
      p3: normalizeParamDescription(game, itemParams.p3),
    };
  }

  return normalizedParams;
}
