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
      if (obj && typeof obj === "object" && "ok" in obj) {
        if (obj.ok) {
          if (converter instanceof Base16Converter) {
            wrapper.data = obj.value;
          } else {
            wrapper.obj = obj.value;
          }
        } else {
          wrapper.conversionError = String(obj.error);
          // Fall back to base16
          wrapper.data = new Base16Converter().unpack(resource, fork);
        }
      } else {
        // Legacy converters that don't return Result
        if (converter instanceof Base16Converter) {
          wrapper.data = obj;
        } else {
          wrapper.obj = obj;
        }
      }

      jsonBlob[typeName][resId.toString()] = wrapper;
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
      if (obj && typeof obj === "object" && "ok" in obj) {
        if (obj.ok) {
          if (converter instanceof Base16Converter) {
            wrapper.data = obj.value;
          } else {
            wrapper.obj = obj.value;
          }
        } else {
          wrapper.conversionError = String(obj.error);
          // Fall back to base16
          wrapper.data = new Base16Converter().unpack(resource, fork);
        }
      } else {
        // Legacy converters that don't return Result
        if (converter instanceof Base16Converter) {
          wrapper.data = obj;
        } else {
          wrapper.obj = obj;
        }
      }

      jsonBlob[typeName][resId.toString()] = wrapper;
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

  // Extract metadata
  const metadata = jsonData._metadata || {};
  // Support both 'fileAttributes' and legacy 'file_attributes' property names
  const fileAttributes =
    (metadata.fileAttributes as number) ||
    ((metadata as Record<string, unknown>)["file_attributes"] as number) ||
    0;
  const junkNextresmap = (metadata.junk1 as number) || 0;
  const junkFilerefnum = (metadata.junk2 as number) || 0;

  // Process each resource type
  for (const [typeName, typeData] of Object.entries(jsonData)) {
    if (typeName === "_metadata") continue;

    const typeResources = new Map<number, Resource>();

    for (const [idStr, resourceData] of Object.entries(
      typeData as Record<string, ConvertedResource>,
    )) {
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
          } else {
            data = packResult as Uint8Array;
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
