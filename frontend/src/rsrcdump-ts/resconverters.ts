// Resource converters for different resource types

import type { Resource, ResourceFork, ResourceConverter, StructTemplate } from './types';
import { StructTemplateParser } from './structtemplate';

export class Base16Converter implements ResourceConverter {
  unpack(resource: Resource, _fork?: ResourceFork): string {
    return Array.from(resource.data)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  pack(obj: string): Uint8Array {
    if (typeof obj !== 'string') {
      throw new Error('Expected string for base16 data');
    }
    
    const result = new Uint8Array(obj.length / 2);
    for (let i = 0; i < obj.length; i += 2) {
      result[i / 2] = parseInt(obj.substr(i, 2), 16);
    }
    return result;
  }
}

export class StructConverter implements ResourceConverter {
  private template: StructTemplate;

  static fromTemplateStringWithTypename(templateArg: string): [StructConverter | null, Uint8Array | null] {
    const trimmed = templateArg.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      return [null, null];
    }

    const split = trimmed.split(':', 3);
    if (split.length < 2) {
      throw new Error('Invalid template format');
    }

    const restype = parseTypeName(split[0]);
    const formatAndFields = split.slice(1).join(':'); // Rejoin format and fields
    const template = StructTemplateParser.fromTemplateString(formatAndFields);
    
    return [new StructConverter(template), restype];
  }

  constructor(template: StructTemplate) {
    this.template = template;
  }

  unpack(resource: Resource, _fork?: ResourceFork): any {
    if (this.template.isList) {
      const result: any[] = [];
      
      if (resource.data.length % this.template.recordLength !== 0) {
        throw new Error(
          `The length of ${resource.type} ${resource.id} (${resource.data.length} bytes) ` +
          `isn't a multiple of the struct format for this resource type ` +
          `(${this.template.recordLength} bytes)`
        );
      }

      const numRecords = resource.data.length / this.template.recordLength;
      for (let i = 0; i < numRecords; i++) {
        const record = StructTemplateParser.unpackRecord(
          resource.data, 
          i * this.template.recordLength, 
          this.template
        );
        result.push(record);
      }
      return result;
    } else {
      if (resource.data.length !== this.template.recordLength) {
        throw new Error(
          `The length of ${resource.type} ${resource.id} (${resource.data.length} bytes) ` +
          `doesn't match the struct format for this resource type ` +
          `(${this.template.recordLength} bytes)`
        );
      }

      return StructTemplateParser.unpackRecord(resource.data, 0, this.template);
    }
  }

  pack(_obj: any): Uint8Array {
    throw new Error('JSON->Binary packing not implemented in StructConverter');
  }
}

// Helper function to parse type names (moved from textio to avoid circular imports)
function parseTypeName(saneName: string): Uint8Array {
  const decoded = new TextEncoder().encode(decodeURIComponent(saneName));
  const result = new Uint8Array(4);
  result.fill(0x20); // space character
  
  for (let i = 0; i < Math.min(decoded.length, 4); i++) {
    result[i] = decoded[i];
  }
  
  if (decoded.length > 4) {
    throw new Error(`decoded restype doesn't work out to 4 bytes`);
  }
  
  return result;
}

export const standardConverters: Map<string, ResourceConverter> = new Map([
  // Add standard converters here as needed
  // For now we'll focus on struct converters
]);