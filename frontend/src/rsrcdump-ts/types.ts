// Type definitions for rsrcdump TypeScript implementation

export interface Resource {
  type: string;
  id: number;
  name?: string;
  data: Uint8Array;
  flags?: number;
  junk?: number;
  order?: number;
}

export interface ResourceFork {
  resources: Map<string, Map<number, Resource>>;
  fileAttributes?: number;
  junkNextresmap?: number;
  junkFilerefnum?: number;
}

export interface StructField {
  name: string;
  value: any;
}

export interface ParsedStruct {
  [key: string]: any;
}

export interface StructTemplate {
  format: string;
  fieldNames: (string | null)[];
  isList: boolean;
  recordLength: number;
}

export interface ResourceConverter {
  unpack(resource: Resource, fork?: ResourceFork): any;
  pack?(obj: any): Uint8Array;
}

export interface ConvertedResource {
  name?: string;
  flags?: number;
  junk?: number;
  order?: number;
  obj?: any;
  data?: string; // hex encoded fallback
  conversionError?: string;
}

export interface JsonOutput {
  _metadata?: {
    junk1?: number;
    junk2?: number;
    fileAttributes?: number;
    adf?: Record<string, string>;
  };
  [resourceType: string]: Record<string, ConvertedResource> | any;
}