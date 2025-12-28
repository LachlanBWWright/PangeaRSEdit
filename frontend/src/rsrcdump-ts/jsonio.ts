// JSON input/output handling

import type {
  ResourceFork,
  ResourceConverter,
  JsonOutput,
  ConvertedResource,
  Resource,
} from "./types";
import { Base16Converter } from "./resconverters";
import { Result, ok, err } from "../types/result";

// Type guard for Result-like objects
function isResultLike(obj: unknown): obj is { ok: boolean; value?: unknown; error?: unknown } {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  if (!("ok" in obj)) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return typeof objRecord.ok === "boolean";
}

// Type guard for ConvertedResource maps
function isConvertedResourceMap(obj: unknown): obj is Record<string, ConvertedResource> {
  return typeof obj === "object" && obj !== null;
}

// Extract number from metadata object with fallback
function getMetadataNumber(
  metadata: Record<string, unknown>,
  key: string,
  legacyKey?: string,
): number {
  const value = metadata[key];
  if (typeof value === "number") {
    return value;
  }
  if (legacyKey) {
    const legacyValue = metadata[legacyKey];
    if (typeof legacyValue === "number") {
      return legacyValue;
    }
  }
  return 0;
}

// Check if value is Uint8Array
function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

export function resourceForkToJson(
  fork: ResourceFork,
  includeTypes: Uint8Array[] = [],
  excludeTypes: Uint8Array[] = [],
  converters: Map<string, ResourceConverter> = new Map(),
  metadata: Record<string, unknown> = {},
  quiet: boolean = false,
): Result<string, Error> {
  const jsonBlob: JsonOutput = {};

  // Add metadata
  if (metadata || fork.fileAttributes !== undefined) {
    jsonBlob._metadata = {
      junk1: fork.junkNextresmap,
      junk2: fork.junkFilerefnum,
      fileAttributes: fork.fileAttributes || 0,
      ...metadata,
    };
  }

  // Convert each resource type
  for (const [typeName, typeResources] of Array.from(fork.resources)) {
    // Check include/exclude filters
    const typeBytes = new TextEncoder().encode(typeName.padEnd(4));

    if (
      includeTypes.length > 0 &&
      !includeTypes.some((included) =>
        typeBytes.every((byte, i) => byte === included[i]),
      )
    ) {
      continue;
    }

    if (
      excludeTypes.some((excluded) =>
        typeBytes.every((byte, i) => byte === excluded[i]),
      )
    ) {
      continue;
    }

    jsonBlob[typeName] = {};

    for (const [resId, resource] of Array.from(typeResources)) {
      if (!quiet) {
        console.log(
          `${resource.type.padEnd(4)} ${resId
            .toString()
            .padStart(6)} ${resource.data.length.toString().padStart(8)}  ${
            resource.name || ""
          }`,
        );
      }

      const wrapper: ConvertedResource = {};

      if (resource.name) {
        wrapper.name = resource.name;
      }

      if (resource.flags && resource.flags !== 0) {
        wrapper.flags = resource.flags;
      }

      if (resource.junk && resource.junk !== 0) {
        wrapper.junk = resource.junk;
      }

      if (resource.order && resource.order !== 0xffffffff) {
        wrapper.order = resource.order;
      }

      // Convert resource data
      const converter = converters.get(typeName) || new Base16Converter();
      const obj = converter.unpack(resource, fork);

      // Handle Result-returning converters
      if (isResultLike(obj)) {
        if (obj.ok) {
          if (converter instanceof Base16Converter) {
            wrapper.data = typeof obj.value === "string" ? obj.value : String(obj.value);
          } else {
            wrapper.obj = obj.value;
          }
        } else {
          wrapper.conversionError = String(obj.error);
          // Fall back to base16
          const fallbackResult = new Base16Converter().unpack(resource, fork);
          wrapper.data = typeof fallbackResult === "string" ? fallbackResult : String(fallbackResult);
        }
      } else {
        // Legacy converters that don't return Result
        if (converter instanceof Base16Converter) {
          wrapper.data = typeof obj === "string" ? obj : String(obj);
        } else {
          wrapper.obj = obj;
        }
      }

      // Initialize typeName entry if it doesn't exist
      if (!(typeName in jsonBlob)) {
        jsonBlob[typeName] = {};
      }
      const typeMap = jsonBlob[typeName];
      if (isConvertedResourceMap(typeMap)) {
        typeMap[resId.toString()] = wrapper;
      }
    }
  }

  return ok(JSON.stringify(jsonBlob, null, "\t"));
}

/**
 * Convert a JSON object to a JSON output format (already parsed)
 * This is useful when you have a JavaScript object instead of a string
 */
export function resourceForkToJsonObject(
  fork: ResourceFork,
  includeTypes: Uint8Array[] = [],
  excludeTypes: Uint8Array[] = [],
  converters: Map<string, ResourceConverter> = new Map(),
  metadata: Record<string, unknown> = {},
  quiet: boolean = true,
): Result<JsonOutput, Error> {
  const jsonBlob: JsonOutput = {};

  // Add metadata
  if (metadata || fork.fileAttributes !== undefined) {
    jsonBlob._metadata = {
      junk1: fork.junkNextresmap,
      junk2: fork.junkFilerefnum,
      fileAttributes: fork.fileAttributes || 0,
      ...metadata,
    };
  }

  // Convert each resource type
  for (const [typeName, typeResources] of Array.from(fork.resources)) {
    // Check include/exclude filters
    const typeBytes = new TextEncoder().encode(typeName.padEnd(4));

    if (
      includeTypes.length > 0 &&
      !includeTypes.some((included) =>
        typeBytes.every((byte, i) => byte === included[i]),
      )
    ) {
      continue;
    }

    if (
      excludeTypes.some((excluded) =>
        typeBytes.every((byte, i) => byte === excluded[i]),
      )
    ) {
      continue;
    }

    jsonBlob[typeName] = {};

    for (const [resId, resource] of Array.from(typeResources)) {
      if (!quiet) {
        console.log(
          `${resource.type.padEnd(4)} ${resId
            .toString()
            .padStart(6)} ${resource.data.length.toString().padStart(8)}  ${
            resource.name || ""
          }`,
        );
      }

      const wrapper: ConvertedResource = {};

      if (resource.name) {
        wrapper.name = resource.name;
      }

      if (resource.flags && resource.flags !== 0) {
        wrapper.flags = resource.flags;
      }

      if (resource.junk && resource.junk !== 0) {
        wrapper.junk = resource.junk;
      }

      if (resource.order && resource.order !== 0xffffffff) {
        wrapper.order = resource.order;
      }

      // Convert resource data
      const converter = converters.get(typeName) || new Base16Converter();
      const obj = converter.unpack(resource, fork);

      // Handle Result-returning converters
      if (isResultLike(obj)) {
        if (obj.ok) {
          if (converter instanceof Base16Converter) {
            wrapper.data = typeof obj.value === "string" ? obj.value : String(obj.value);
          } else {
            wrapper.obj = obj.value;
          }
        } else {
          wrapper.conversionError = String(obj.error);
          // Fall back to base16
          const fallbackResult = new Base16Converter().unpack(resource, fork);
          wrapper.data = typeof fallbackResult === "string" ? fallbackResult : String(fallbackResult);
        }
      } else {
        // Legacy converters that don't return Result
        if (converter instanceof Base16Converter) {
          wrapper.data = typeof obj === "string" ? obj : String(obj);
        } else {
          wrapper.obj = obj;
        }
      }

      // Initialize typeName entry if it doesn't exist
      if (!(typeName in jsonBlob)) {
        jsonBlob[typeName] = {};
      }
      const typeMap = jsonBlob[typeName];
      if (isConvertedResourceMap(typeMap)) {
        typeMap[resId.toString()] = wrapper;
      }
    }
  }

  return ok(jsonBlob);
}

/**
 * Convert JSON output back to a ResourceFork
 * This is the inverse of resourceForkToJsonObject
 */
export function jsonToResourceFork(
  jsonData: JsonOutput,
  converters: Map<string, ResourceConverter> = new Map(),
): Result<ResourceFork, Error> {
  const resources = new Map<string, Map<number, Resource>>();

  // Extract metadata - convert typed metadata to Record<string, unknown>
  const metadataObj = jsonData._metadata || {};
  const metadata: Record<string, unknown> = {
    junk1: metadataObj.junk1,
    junk2: metadataObj.junk2,
    fileAttributes: metadataObj.fileAttributes,
  };
  // Support both 'fileAttributes' and legacy 'file_attributes' property names
  const fileAttributes = getMetadataNumber(metadata, "fileAttributes", "file_attributes");
  const junkNextresmap = getMetadataNumber(metadata, "junk1");
  const junkFilerefnum = getMetadataNumber(metadata, "junk2");

  // Process each resource type
  for (const [typeName, typeData] of Object.entries(jsonData)) {
    if (typeName === "_metadata") continue;

    if (!isConvertedResourceMap(typeData)) {
      continue;
    }

    const typeResources = new Map<number, Resource>();

    for (const [idStr, resourceData] of Object.entries(typeData)) {
      const id = parseInt(idStr, 10);

      // Convert resource data back to binary
      let data: Uint8Array;

      if (resourceData.obj !== undefined) {
        // Use converter to pack structured data back to binary
        const converter = converters.get(typeName);
        if (converter && converter.pack) {
          const packResult = converter.pack(resourceData.obj);
          // Handle Result-returning pack functions
          if (
            packResult &&
            typeof packResult === "object" &&
            "ok" in packResult
          ) {
            if (packResult.ok) {
              data = packResult.value;
            } else {
              return err(packResult.error);
            }
          } else if (isUint8Array(packResult)) {
            data = packResult;
          } else {
            return err(
              new Error(
                `Pack function returned unexpected type for resource type ${typeName}`,
              ),
            );
          }
        } else {
          return err(
            new Error(
              `No pack function available for resource type ${typeName}`,
            ),
          );
        }
      } else if (resourceData.data !== undefined) {
        // Convert hex string back to binary
        const hexStr = resourceData.data;
        const bytes = new Uint8Array(hexStr.length / 2);
        for (let i = 0; i < hexStr.length; i += 2) {
          bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
        }
        data = bytes;
      } else {
        return err(
          new Error(
            `Resource ${typeName}:${id} has neither obj nor data field`,
          ),
        );
      }

      const resource: Resource = {
        type: typeName,
        id,
        data,
        name: resourceData.name,
        flags: resourceData.flags || 0,
        junk: resourceData.junk || 0,
        order: resourceData.order || 0xffffffff,
      };

      typeResources.set(id, resource);
    }

    if (typeResources.size > 0) {
      resources.set(typeName, typeResources);
    }
  }

  return ok({
    resources,
    fileAttributes,
    junkNextresmap,
    junkFilerefnum,
  });
}
