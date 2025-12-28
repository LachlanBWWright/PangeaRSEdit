// Resource converters for different resource types

import type {
  Resource,
  ResourceFork,
  ResourceConverter,
  StructTemplate,
} from "./types";
import { StructTemplateParser } from "./structtemplate";
import { Result, ok, err } from "../types/result";

export class Base16Converter implements ResourceConverter {
  unpack(resource: Resource, fork?: ResourceFork): string {
    console.log(fork);
    return Array.from(resource.data)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  }

  pack(obj: string): Result<Uint8Array, Error> {
    if (typeof obj !== "string") {
      return err(new Error("Expected string for base16 data"));
    }

    const result = new Uint8Array(obj.length / 2);
    for (let i = 0; i < obj.length; i += 2) {
      result[i / 2] = parseInt(obj.substr(i, 2), 16);
    }
    return ok(result);
  }
}

export class StructConverter implements ResourceConverter {
  private template: StructTemplate;

  static fromTemplateStringWithTypename(
    templateArg: string,
  ): Result<[StructConverter | null, Uint8Array | null], Error> {
    const trimmed = templateArg.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return ok([null, null]);
    }

    const split = trimmed.split(":", 3);
    if (split.length < 2) {
      return err(new Error("Invalid template format"));
    }

    const restypeResult = parseTypeName(split[0] ?? "");
    if (!restypeResult.ok) {
      return restypeResult;
    }

    const formatAndFields = split.slice(1).join(":"); // Rejoin format and fields
    const templateResult =
      StructTemplateParser.fromTemplateString(formatAndFields);
    if (!templateResult.ok) {
      return templateResult;
    }

    return ok([new StructConverter(templateResult.value), restypeResult.value]);
  }

  constructor(template: StructTemplate) {
    this.template = template;
  }

  unpack(resource: Resource, fork?: ResourceFork): Result<unknown, Error> {
    // Using `_fork` param for API compatibility; mark used so lint doesn't flag as unused
    console.log(fork);
    if (this.template.isList) {
      const result: unknown[] = [];

      if (resource.data.length % this.template.recordLength !== 0) {
        return err(
          new Error(
            `The length of ${resource.type} ${resource.id} (${resource.data.length} bytes) ` +
              `isn't a multiple of the struct format for this resource type ` +
              `(${this.template.recordLength} bytes)`,
          ),
        );
      }

      const numRecords = resource.data.length / this.template.recordLength;
      for (let i = 0; i < numRecords; i++) {
        const recordResult = StructTemplateParser.unpackRecord(
          resource.data,
          i * this.template.recordLength,
          this.template,
        );
        if (!recordResult.ok) {
          return recordResult;
        }
        result.push(recordResult.value);
      }
      return ok(result);
    } else {
      if (resource.data.length !== this.template.recordLength) {
        return err(
          new Error(
            `The length of ${resource.type} ${resource.id} (${resource.data.length} bytes) ` +
              `doesn't match the struct format for this resource type ` +
              `(${this.template.recordLength} bytes)`,
          ),
        );
      }

      return StructTemplateParser.unpackRecord(resource.data, 0, this.template);
    }
  }

  pack(obj: unknown): Result<Uint8Array, Error> {
    // Keep `_obj` referenced to satisfy unused-vars rule; actual pack not implemented
    console.log(obj);
    return err(
      new Error("JSON->Binary packing not implemented in StructConverter"),
    );
  }
}

// Helper function to parse type names (moved from textio to avoid circular imports)
function parseTypeName(saneName: string): Result<Uint8Array, Error> {
  const decoded = new TextEncoder().encode(decodeURIComponent(saneName));
  const result = new Uint8Array(4);
  result.fill(0x20); // space character

  for (let i = 0; i < Math.min(decoded.length, 4); i++) {
    const byte = decoded[i];
    if (byte !== undefined) {
      result[i] = byte;
    }
  }

  if (decoded.length > 4) {
    return err(new Error(`decoded restype doesn't work out to 4 bytes`));
  }

  return ok(result);
}

export const standardConverters: Map<string, ResourceConverter> = new Map([
  // Add standard converters here as needed
  // For now we'll focus on struct converters
]);
