// Main API for rsrcdump TypeScript library

import type { ResourceFork, ResourceConverter, JsonOutput } from "./types";
import { ResourceForkParser } from "./resfork";
import {
  resourceForkToJson,
  resourceForkToJsonObject,
  jsonToResourceFork,
} from "./jsonio";
import { StructConverter, standardConverters } from "./resconverters";
import { parseTypeName } from "./textio";
import { unpackAdf, NotADFError, ADF_ENTRYNUM_RESOURCEFORK } from "./adf";
import { getDefaultOttoConverters, loadOttoSpecsFromText } from "./ottoSpecs";
import { Result, ok, err } from '../types/result';

export function load(data: Uint8Array): Result<ResourceFork, Error> {
  const adfResult = unpackAdf(data);
  
  if (adfResult.ok) {
    const adfResfork = adfResult.value.get(ADF_ENTRYNUM_RESOURCEFORK);
    if (!adfResfork) {
      return err(new Error("No resource fork found in ADF"));
    }
    return ResourceForkParser.fromBytes(adfResfork);
  } else {
    // Not an ADF file, try parsing as raw resource fork
    if (adfResult.error instanceof NotADFError) {
      return ResourceForkParser.fromBytes(data);
    }
    return err(adfResult.error);
  }
}

export function saveToJson(
  data: Uint8Array,
  structSpecs: string[] = [],
  includeTypes: string[] = [],
  excludeTypes: string[] = [],
  useOttoSpecs: boolean = true,
): Result<string, Error> {
  const forkResult = load(data);
  if (!forkResult.ok) {
    return forkResult;
  }

  const convertersResult = getConverters(structSpecs, useOttoSpecs);
  if (!convertersResult.ok) {
    return convertersResult;
  }

  const includeTypesResult = mapParseTypeNames(includeTypes);
  if (!includeTypesResult.ok) {
    return includeTypesResult;
  }

  const excludeTypesResult = mapParseTypeNames(excludeTypes);
  if (!excludeTypesResult.ok) {
    return excludeTypesResult;
  }

  return resourceForkToJson(
    forkResult.value,
    includeTypesResult.value,
    excludeTypesResult.value,
    convertersResult.value,
    {},
  );
}

export function saveToJsonWithOttoSpecs(
  data: Uint8Array,
  ottoSpecsText: string,
  structSpecs: string[] = [],
  includeTypes: string[] = [],
  excludeTypes: string[] = [],
): Result<string, Error> {
  const forkResult = load(data);
  if (!forkResult.ok) {
    return forkResult;
  }

  const converters = new Map(standardConverters);

  // Add otto specs converters
  const ottoConvertersResult = loadOttoSpecsFromText(ottoSpecsText);
  if (!ottoConvertersResult.ok) {
    return ottoConvertersResult;
  }
  for (const [type, converter] of Array.from(ottoConvertersResult.value)) {
    converters.set(type, converter);
  }

  // Add additional struct specs
  for (const templateArg of structSpecs) {
    const converterResult = StructConverter.fromTemplateStringWithTypename(templateArg);
    if (!converterResult.ok) {
      return converterResult;
    }
    const [converter, restype] = converterResult.value;
    if (converter && restype) {
      const typeName = new TextDecoder("utf-8").decode(restype).trim();
      converters.set(typeName, converter);
    }
  }

  const includeTypesResult = mapParseTypeNames(includeTypes);
  if (!includeTypesResult.ok) {
    return includeTypesResult;
  }

  const excludeTypesResult = mapParseTypeNames(excludeTypes);
  if (!excludeTypesResult.ok) {
    return excludeTypesResult;
  }

  return resourceForkToJson(
    forkResult.value,
    includeTypesResult.value,
    excludeTypesResult.value,
    converters,
    {},
  );
}

function mapParseTypeNames(types: string[]): Result<Uint8Array[], Error> {
  const results: Uint8Array[] = [];
  for (const type of types) {
    const result = parseTypeName(type);
    if (!result.ok) {
      return result;
    }
    results.push(result.value);
  }
  return ok(results);
}

function getConverters(
  structSpecs: string[],
  useOttoSpecs: boolean = true,
): Result<Map<string, ResourceConverter>, Error> {
  const converters = new Map(standardConverters);

  // Add default otto specs converters if requested
  if (useOttoSpecs) {
    const ottoConvertersResult = getDefaultOttoConverters();
    if (!ottoConvertersResult.ok) {
      return ottoConvertersResult;
    }
    for (const [type, converter] of Array.from(ottoConvertersResult.value)) {
      converters.set(type, converter);
    }
  }

  // Add additional struct specs
  for (const templateArg of structSpecs) {
    const converterResult = StructConverter.fromTemplateStringWithTypename(templateArg);
    if (!converterResult.ok) {
      return converterResult;
    }
    const [converter, restype] = converterResult.value;
    if (converter && restype) {
      const typeName = new TextDecoder("utf-8").decode(restype).trim();
      converters.set(typeName, converter);
    }
  }

  return ok(converters);
}

/**
 * Parse JSON output back to a ResourceFork
 */
export function loadFromJson(
  jsonData: JsonOutput | string,
  structSpecs: string[] = [],
  useOttoSpecs: boolean = true,
): Result<ResourceFork, Error> {
  const convertersResult = getConverters(structSpecs, useOttoSpecs);
  if (!convertersResult.ok) {
    return convertersResult;
  }
  
  const parsed = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
  return jsonToResourceFork(parsed, convertersResult.value);
}

/**
 * Serialize a ResourceFork to binary
 */
export function saveToBytes(fork: ResourceFork): Uint8Array {
  return ResourceForkParser.toBytes(fork);
}

/**
 * Convert JSON directly to binary
 */
export function saveFromJson(
  jsonData: JsonOutput | string,
  structSpecs: string[] = [],
  useOttoSpecs: boolean = true,
): Result<Uint8Array, Error> {
  const forkResult = loadFromJson(jsonData, structSpecs, useOttoSpecs);
  if (!forkResult.ok) {
    return forkResult;
  }
  return ok(saveToBytes(forkResult.value));
}

/**
 * Parse binary to JSON object (not string)
 */
export function saveToJsonObject(
  data: Uint8Array,
  structSpecs: string[] = [],
  includeTypes: string[] = [],
  excludeTypes: string[] = [],
  useOttoSpecs: boolean = true,
): Result<JsonOutput, Error> {
  const forkResult = load(data);
  if (!forkResult.ok) {
    return forkResult;
  }

  const convertersResult = getConverters(structSpecs, useOttoSpecs);
  if (!convertersResult.ok) {
    return convertersResult;
  }

  const includeTypesResult = mapParseTypeNames(includeTypes);
  if (!includeTypesResult.ok) {
    return includeTypesResult;
  }

  const excludeTypesResult = mapParseTypeNames(excludeTypes);
  if (!excludeTypesResult.ok) {
    return excludeTypesResult;
  }

  return resourceForkToJsonObject(
    forkResult.value,
    includeTypesResult.value,
    excludeTypesResult.value,
    convertersResult.value,
    {},
  );
}

// Re-export types and utilities
export * from "./types";
export * from "./textio";
export * from "./resfork";
export * from "./resconverters";
export * from "./structtemplate";
export * from "./jsonio";
