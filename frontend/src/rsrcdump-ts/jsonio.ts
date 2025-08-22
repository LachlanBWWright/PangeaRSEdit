// JSON input/output handling

import type { ResourceFork, ResourceConverter, JsonOutput, ConvertedResource } from './types';
import { Base16Converter } from './resconverters';

export function resourceForkToJson(
  fork: ResourceFork,
  includeTypes: Uint8Array[] = [],
  excludeTypes: Uint8Array[] = [],
  converters: Map<string, ResourceConverter> = new Map(),
  metadata: any = {},
  quiet: boolean = false
): string {
  const jsonBlob: JsonOutput = {};
  
  // Add metadata
  if (metadata || fork.fileAttributes !== undefined) {
    jsonBlob._metadata = {
      junk1: fork.junkNextresmap,
      junk2: fork.junkFilerefnum,
      file_attributes: fork.fileAttributes || 0,
      ...metadata
    };
  }
  
  // Convert each resource type
  for (const [typeName, typeResources] of Array.from(fork.resources)) {
    // Check include/exclude filters
    const typeBytes = new TextEncoder().encode(typeName.padEnd(4));
    
    if (includeTypes.length > 0 && !includeTypes.some(included => 
      typeBytes.every((byte, i) => byte === included[i])
    )) {
      continue;
    }
    
    if (excludeTypes.some(excluded => 
      typeBytes.every((byte, i) => byte === excluded[i])
    )) {
      continue;
    }
    
    jsonBlob[typeName] = {};
    
    for (const [resId, resource] of Array.from(typeResources)) {
      if (!quiet) {
        console.log(`${resource.type.padEnd(4)} ${resId.toString().padStart(6)} ${resource.data.length.toString().padStart(8)}  ${resource.name || ''}`);
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
      
      if (resource.order && resource.order !== 0xFFFFFFFF) {
        wrapper.order = resource.order;
      }
      
      // Convert resource data
      try {
        const converter = converters.get(typeName) || new Base16Converter();
        const obj = converter.unpack(resource, fork);
        
        if (converter instanceof Base16Converter) {
          wrapper.data = obj;
        } else {
          wrapper.obj = obj;
        }
      } catch (convertException) {
        wrapper.conversionError = String(convertException);
        // Fall back to base16
        wrapper.data = new Base16Converter().unpack(resource, fork);
      }
      
      jsonBlob[typeName][resId.toString()] = wrapper;
    }
  }
  
  return JSON.stringify(jsonBlob, null, '\t');
}