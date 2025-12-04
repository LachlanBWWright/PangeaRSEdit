// Struct template parsing for binary data formats

import type { StructTemplate } from './types';
import { Result, ok, err } from '../types/result';

export class StructTemplateParser {
  static fromTemplateString(template: string): Result<StructTemplate, Error> {
    const split = template.split(':', 3);
    
    const formatStr = split.shift();
    const fieldNames = split.length > 0 ? (split.shift()?.split(',') ?? []) : [];
    
    if (!formatStr) {
      return err(new Error('Empty format string'));
    }
    
    const parser = new StructTemplateParser(formatStr, fieldNames);
    return parser.build();
  }

  private formatStr: string;
  private fieldNames: string[];
  private isList: boolean = false;
  private recordLength: number = 0;

  constructor(formatStr: string, fieldNames: string[]) {
    this.formatStr = formatStr;
    this.fieldNames = fieldNames;
    
    // Handle list indicator
    if (this.formatStr.endsWith('+')) {
      this.isList = true;
      this.formatStr = this.formatStr.slice(0, -1);
    }
    
    // Add endianness if not specified (default to big-endian)
    if (!this.formatStr.match(/^[!@=<>]/)) {
      this.formatStr = '>' + this.formatStr;
    }
  }

  build(): Result<StructTemplate, Error> {
    const fieldFormatsResult = this.splitStructFormatFields(this.formatStr);
    if (!fieldFormatsResult.ok) {
      return fieldFormatsResult;
    }
    const fieldFormats = fieldFormatsResult.value;
    
    const recordLengthResult = this.calculateRecordLength(fieldFormats);
    if (!recordLengthResult.ok) {
      return recordLengthResult;
    }
    this.recordLength = recordLengthResult.value;
    
    return ok({
      format: this.formatStr,
      fieldNames: this.expandFieldNames(fieldFormats),
      isList: this.isList,
      recordLength: this.recordLength
    });
  }

  private splitStructFormatFields(fmt: string): Result<string[], Error> {
    const fields: string[] = [];
    let repeat = 0;
    
    for (let i = 0; i < fmt.length; i++) {
      const c = fmt[i];
      if (c === undefined) continue;
      
      // Ignore redundant values
      if (/\s/.test(c) || '@!><'.includes(c)) {
        continue;
      }
      
      // Calculate repeat count
      if (/\d/.test(c)) {
        repeat = repeat * 10 + parseInt(c);
        continue;
      }
      
      // Handle format characters
      if (/[CB?HILFQD]/.test(c.toUpperCase()) || c === 'x') {
        for (let j = 0; j < Math.max(repeat || 1, 1); j++) {
          fields.push(c);
        }
        repeat = 0;
      } else if (c === 's') {
        fields.push(`${Math.max(repeat || 1, 1)}${c}`);
        repeat = 0;
      } else {
        return err(new Error(`Unsupported struct format character '${c}'`));
      }
    }
    
    return ok(fields);
  }

  private calculateRecordLength(fields: string[]): Result<number, Error> {
    let length = 0;
    
    for (const field of fields) {
      switch (field) {
        case 'B': // unsigned char
        case 'b': // signed char
        case 'c': // char
        case 'x': // pad byte
        case '?': // bool
          length += 1;
          break;
        case 'H': // unsigned short
        case 'h': // signed short
          length += 2;
          break;
        case 'I': // unsigned int
        case 'i': // signed int
        case 'L': // unsigned long
        case 'l': // signed long
        case 'f': // float
          length += 4;
          break;
        case 'Q': // unsigned long long
        case 'q': // signed long long  
        case 'd': // double
          length += 8;
          break;
        default:
          if (field.endsWith('s')) {
            // String field like "4s"
            const num = parseInt(field.slice(0, -1));
            length += num;
          } else {
            return err(new Error(`Unknown field type: ${field}`));
          }
      }
    }
    
    return ok(length);
  }

  private expandFieldNames(fields: string[]): (string | null)[] {
    const result: (string | null)[] = [];
    let fieldNameIndex = 0;
    let fieldIndex = 0;
    
    while (fieldIndex < fields.length && fieldNameIndex < this.fieldNames.length) {
      const field = fields[fieldIndex];
      const fieldName = this.fieldNames[fieldNameIndex];
      
      // Skip 'x' (padding) fields - they should be ignored completely  
      if (field === 'x') {
        result.push(null);
        fieldIndex++;
        continue;
      }
      
      // Handle array expansion like x`y[100] -> x_0, y_0, x_1, y_1, ... x_99, y_99
      if (fieldName && fieldName.includes('[') && fieldName.includes(']')) {
        const expandedNames = this.expandArrayFieldNames(fieldName, fieldIndex, fields);
        result.push(...expandedNames);
        fieldIndex += expandedNames.length;
        fieldNameIndex++;
      } else {
        result.push(fieldName || null);
        fieldIndex++;
        fieldNameIndex++;
      }
    }
    
    // Fill remaining fields with null
    while (fieldIndex < fields.length) {
      result.push(null);
      fieldIndex++;
    }
    
    return result;
  }

  private expandArrayFieldNames(fieldName: string, startFieldIndex: number, fields: string[]): string[] {
    // Handle patterns like x`y[100] which should expand to x_0, y_0, x_1, y_1, ...
    const match = fieldName.match(/^(.+?)`(.+?)\[(\d+)\]$/);
    if (!match) {
      return [fieldName]; // Not an array pattern
    }
    
    const [, prefix, suffix, countStr] = match;
    const count = parseInt(countStr ?? '0');
    
    // Count how many consecutive non-x fields we have starting from startFieldIndex
    let availableFields = 0;
    for (let i = startFieldIndex; i < fields.length && fields[i] !== 'x'; i++) {
      availableFields++;
    }
    
    // Generate pairs: x_0, y_0, x_1, y_1, ... up to the available field count
    const result: string[] = [];
    const numPairs = Math.min(count, Math.floor(availableFields / 2));
    
    for (let i = 0; i < numPairs; i++) {
      result.push(`${prefix}_${i}`);
      result.push(`${suffix}_${i}`);
    }
    
    return result;
  }

  static unpackRecord(data: Uint8Array, offset: number, template: StructTemplate): Result<any, Error> {
    const view = new DataView(data.buffer, data.byteOffset + offset);
    const values: any[] = [];
    let pos = 0;

    const fieldsResult = this.splitStructFormatFieldsStatic(template.format);
    if (!fieldsResult.ok) {
      return fieldsResult;
    }
    const fields = fieldsResult.value;
    
    for (const field of fields) {
      switch (field) {
        case 'B': // unsigned char
          values.push(view.getUint8(pos));
          pos += 1;
          break;
        case 'b': // signed char
          values.push(view.getInt8(pos));
          pos += 1;
          break;
        case 'H': // unsigned short (big-endian)
          values.push(view.getUint16(pos, false));
          pos += 2;
          break;
        case 'h': // signed short (big-endian)
          values.push(view.getInt16(pos, false));
          pos += 2;
          break;
        case 'I': // unsigned int (big-endian)
        case 'L': // unsigned long (big-endian)
          values.push(view.getUint32(pos, false));
          pos += 4;
          break;
        case 'i': // signed int (big-endian)
        case 'l': // signed long (big-endian)
          values.push(view.getInt32(pos, false));
          pos += 4;
          break;
        case 'f': // float (big-endian)
          values.push(view.getFloat32(pos, false));
          pos += 4;
          break;
        case 'Q': // unsigned long long (big-endian)
          values.push(view.getBigUint64(pos, false));
          pos += 8;
          break;
        case 'q': // signed long long (big-endian)
          values.push(view.getBigInt64(pos, false));
          pos += 8;
          break;
        case 'd': // double (big-endian)
          values.push(view.getFloat64(pos, false));
          pos += 8;
          break;
        case 'x': // pad byte - read but don't include in output
          view.getUint8(pos); // Read but discard
          values.push(null); // Placeholder for ignored field
          pos += 1;
          break;
        case '?': // bool (treat as byte for now)
          values.push(view.getUint8(pos));
          pos += 1;
          break;
        default:
          if (field.endsWith('s')) {
            // String field
            const num = parseInt(field.slice(0, -1));
            const bytes = new Uint8Array(data.buffer, data.byteOffset + offset + pos, num);
            values.push(new TextDecoder('utf-8').decode(bytes));
            pos += num;
          } else {
            return err(new Error(`Unknown field type: ${field}`));
          }
      }
    }

    return ok(this.tagValues(values, template));
  }

  private static splitStructFormatFieldsStatic(fmt: string): Result<string[], Error> {
    // Remove endianness prefix for field parsing
    const cleanFmt = fmt.replace(/^[!@=<>]/, '');
    const fields: string[] = [];
    let repeat = 0;
    
    for (let i = 0; i < cleanFmt.length; i++) {
      const c = cleanFmt[i];
      if (c === undefined) continue;
      
      // Ignore whitespace
      if (/\s/.test(c)) {
        continue;
      }
      
      // Calculate repeat count
      if (/\d/.test(c)) {
        repeat = repeat * 10 + parseInt(c);
        continue;
      }
      
      // Handle format characters
      if (/[CB?HILFQD]/.test(c.toUpperCase()) || c === 'x') {
        for (let j = 0; j < Math.max(repeat || 1, 1); j++) {
          fields.push(c);
        }
        repeat = 0;
      } else if (c === 's') {
        fields.push(`${Math.max(repeat || 1, 1)}${c}`);
        repeat = 0;
      }
    }
    
    return ok(fields);
  }

  private static tagValues(values: any[], template: StructTemplate): any {
    const firstFieldName = template.fieldNames[0];
    if (template.fieldNames.length === 1 && !firstFieldName) {
      // Scalar value
      return values[0];
    }
    
    const result: any = {};
    
    for (let i = 0; i < values.length && i < template.fieldNames.length; i++) {
      const fieldName = template.fieldNames[i];
      const value = values[i];
      
      // Skip fields that should be ignored (null fieldName means 'x' padding field)
      if (fieldName === null || fieldName === undefined) {
        continue;
      }
      
      result[fieldName] = value;
    }
    
    return result;
  }
}