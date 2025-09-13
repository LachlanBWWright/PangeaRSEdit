// Resource fork parsing

import type { Resource, ResourceFork } from './types';
import { sanitizeTypeName } from './textio';

export class ResourceForkParser {
  static fromBytes(data: Uint8Array): ResourceFork {
    if (data.length === 0) {
      return {
        resources: new Map(),
        fileAttributes: 0,
        junkNextresmap: 0,
        junkFilerefnum: 0
      };
    }

    if (data.length < 16) {
      throw new Error('data is too small to contain a valid resource fork header');
    }

    const view = new DataView(data.buffer, data.byteOffset);
    
    // Read resource header
    const dataOffset = view.getUint32(0, false);
    const mapOffset = view.getUint32(4, false);
    const dataLength = view.getUint32(8, false);
    const mapLength = view.getUint32(12, false);
    
    if (dataOffset + dataLength > data.length || mapOffset + mapLength > data.length) {
      throw new Error('Invalid resource fork: offsets/lengths in header are nonsense');
    }

    // Create views for data and map sections
    const mapData = new Uint8Array(data.buffer, data.byteOffset + mapOffset, mapLength);
    const mapView = new DataView(mapData.buffer, mapData.byteOffset);
    
    // Read map header - skip copy of resource header (16 bytes)
    let pos = 16;
    const junkNextresmap = mapView.getUint32(pos, false); pos += 4;
    const junkFilerefnum = mapView.getUint16(pos, false); pos += 2;
    const fileAttributes = mapView.getUint16(pos, false); pos += 2;
    const typeListOffsetInMap = mapView.getUint16(pos, false); pos += 2;
    const nameListOffsetInMap = mapView.getUint16(pos, false); pos += 2;
    const numTypes = mapView.getUint16(pos, false) + 1; pos += 2;
    
    const resources = new Map<string, Map<number, Resource>>();
    
    // Read type list - positioned after the map header
    pos = typeListOffsetInMap + 2; // skip the count we already read
    
    for (let i = 0; i < numTypes; i++) {
      // Read type entry from main map: 4-byte type, 2-byte count, 2-byte offset
      const typeBytes = new Uint8Array(mapData.buffer, mapData.byteOffset + pos, 4);
      const typeName = sanitizeTypeName(typeBytes);
      const resourceCount = mapView.getUint16(pos + 4, false) + 1;
      const resourceListOffset = mapView.getUint16(pos + 6, false);
      
      pos += 8;
      
      const typeResources = new Map<number, Resource>();
      
      // Read resources for this type from the resource list
      let resPos = typeListOffsetInMap + resourceListOffset;
      
      for (let j = 0; j < resourceCount; j++) {
        // Each resource entry is 12 bytes: id(2), nameOffset(2), packedAttr(4), junk(4)
        const id = mapView.getInt16(resPos, false);
        const nameOffset = mapView.getUint16(resPos + 2, false);
        const packedAttr = mapView.getUint32(resPos + 4, false);
        const junk = mapView.getUint32(resPos + 8, false);
        
        resPos += 12;
        
        // Unpack attributes
        const flags = (packedAttr & 0xFF000000) >>> 24;
        const resourceDataOffset = packedAttr & 0x00FFFFFF;
        
        // Read resource data from data section
        const actualDataOffset = dataOffset + resourceDataOffset;
        
        if (actualDataOffset + 4 > data.length) {
          console.warn(`Skipping resource ${typeName}:${id} - data offset out of bounds`);
          continue;
        }
        
        const resourceDataLength = view.getUint32(actualDataOffset, false);
        
        if (actualDataOffset + 4 + resourceDataLength > data.length) {
          console.warn(`Skipping resource ${typeName}:${id} - data length out of bounds`);
          continue;
        }
        
        const resourceData = new Uint8Array(
          data.buffer,
          data.byteOffset + actualDataOffset + 4,
          resourceDataLength
        );
        
        // Read resource name if present
        let name: string | undefined;
        if (nameOffset !== 0xFFFF) {
          const namePos = nameListOffsetInMap + nameOffset;
          if (namePos < mapLength) {
            const nameLength = mapData[namePos];
            if (namePos + 1 + nameLength <= mapLength) {
              name = new TextDecoder('latin1').decode(
                mapData.slice(namePos + 1, namePos + 1 + nameLength)
              );
            }
          }
        }
        
        const resource: Resource = {
          type: typeName,
          id,
          data: resourceData,
          name,
          flags,
          junk,
          order: 0xFFFFFFFF
        };
        
        typeResources.set(id, resource);
      }
      
      if (typeResources.size > 0) {
        resources.set(typeName, typeResources);
      }
    }
    
    return {
      resources,
      fileAttributes,
      junkNextresmap,
      junkFilerefnum
    };
  }
}