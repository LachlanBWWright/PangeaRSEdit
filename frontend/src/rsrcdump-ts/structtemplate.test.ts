import { StructTemplateParser } from './structtemplate';
import { describe, it, expect } from 'vitest';

describe('StructTemplate parsing', () => {
  it('should handle simple struct without x fields', () => {
    const template = StructTemplateParser.fromTemplateString('Hi+:version,count');
    
    expect(template.isList).toBe(true);
    expect(template.fieldNames).toEqual(['version', 'count']);
    expect(template.format).toBe('>Hi');
  });

  it('should ignore x fields in field mapping', () => {
    const template = StructTemplateParser.fromTemplateString('H x i+:version,count');
    
    expect(template.isList).toBe(true);
    // Should have 3 field slots but only 2 named fields (x is ignored)
    expect(template.fieldNames).toEqual(['version', null, 'count']);
  });

  it('should expand array notation x`y[2]', () => {
    const template = StructTemplateParser.fromTemplateString('H 4f f+:type,x`y[2],extra');
    
    expect(template.isList).toBe(true);
    // H=type, 4f should expand to x_0,y_0,x_1,y_1, f=extra  
    expect(template.fieldNames).toEqual(['type', 'x_0', 'y_0', 'x_1', 'y_1', 'extra']);
  });

  it('should parse Liqd format correctly', () => {
    const liqdSpec = 'H x x I i h x x i 200f f f h h h h+:type,flags,height,numNubs,reserved,x`y[100],hotSpotX,hotSpotZ,bBoxTop,bBoxLeft,bBoxBottom,bBoxRight';
    const template = StructTemplateParser.fromTemplateString(liqdSpec);
    
    expect(template.isList).toBe(true);
    
    // Check that field names are expanded correctly
    const fieldNames = template.fieldNames;
    expect(fieldNames[0]).toBe('type');      // H
    expect(fieldNames[1]).toBe(null);        // x (ignored)
    expect(fieldNames[2]).toBe(null);        // x (ignored)  
    expect(fieldNames[3]).toBe('flags');     // I
    expect(fieldNames[4]).toBe('height');    // i
    expect(fieldNames[5]).toBe('numNubs');   // h
    expect(fieldNames[6]).toBe(null);        // x (ignored)
    expect(fieldNames[7]).toBe(null);        // x (ignored)
    expect(fieldNames[8]).toBe('reserved');  // i
    
    // Check coordinate expansion x_0, y_0, x_1, y_1, ... x_99, y_99
    expect(fieldNames[9]).toBe('x_0');       // first float
    expect(fieldNames[10]).toBe('y_0');      // second float
    expect(fieldNames[11]).toBe('x_1');      // third float
    expect(fieldNames[12]).toBe('y_1');      // fourth float
    
    // Check last coordinates  
    expect(fieldNames[207]).toBe('x_99');    // 199th float (9 + 198 = 207)
    expect(fieldNames[208]).toBe('y_99');    // 200th float (9 + 199 = 208)
    
    // Check remaining fields
    expect(fieldNames[209]).toBe('hotSpotX');  // f
    expect(fieldNames[210]).toBe('hotSpotZ');  // f
    expect(fieldNames[211]).toBe('bBoxTop');   // h
    expect(fieldNames[212]).toBe('bBoxLeft');  // h
    expect(fieldNames[213]).toBe('bBoxBottom'); // h
    expect(fieldNames[214]).toBe('bBoxRight'); // h
  });
});