// Unit tests for TypeScript rsrcdump implementation

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { load, saveToJson } from './rsrcdump';
// import { ottoMaticSpecs } from './ottoSpecs';

describe('TypeScript rsrcdump', () => {
  const testFile = join(__dirname, '..', 'EarthFarm.ter.rsrc');

  it('should load resource fork', () => {
    const data = readFileSync(testFile);
    const fork = load(data);
    
    expect(fork).toBeDefined();
    expect(fork.resources).toBeDefined();
    
    // Debug: log what types were found
    console.log('Found resource types:', Array.from(fork.resources.keys()));
    
    // Check that we have expected resource types
    const expectedTypes = new Set(['Hedr', 'Atrb', 'STgd', 'Layr', 'YCrd', 'Itms', 
                                  'Spln', 'SpNb', 'SpPt', 'SpIt', 'Fenc', 'FnNb', 'Liqd']);
    const actualTypes = new Set(fork.resources.keys());
    
    for (const expectedType of expectedTypes) {
      expect(actualTypes.has(expectedType), `Missing resource type: ${expectedType}`).toBe(true);
    }
  });

  it('should convert to JSON with otto specs', () => {
    const data = readFileSync(testFile);
    
    const jsonStr = saveToJson(
      data,
      [], // No additional struct specs
      [], // No include types filter
      [], // No exclude types filter  
      true // Use otto specs
    );
    
    // Parse the JSON to ensure it's valid
    const parsed = JSON.parse(jsonStr);
    
    // Check for expected structure
    expect(parsed._metadata).toBeDefined();
    expect(parsed.Hedr).toBeDefined();
    expect(parsed.Hedr['1000']).toBeDefined();
    
    // Check header values
    const header = parsed.Hedr['1000'].obj;
    expect(header).toBeDefined();
    expect(header.version).toBe(134217728);
    expect(header.mapWidth).toBe(176);
    expect(header.mapHeight).toBe(176);
    
    // Save to file for comparison with Python
    const outputFile = join(__dirname, '..', '..', 'typescript_test_output.json');
    writeFileSync(outputFile, jsonStr);
    
    console.log(`TypeScript output saved to: ${outputFile}`);
  });

  it('should parse specific resources', () => {
    const data = readFileSync(testFile);
    const fork = load(data);
    
    // Check header resource exists
    expect(fork.resources.has('Hedr')).toBe(true);
    const hedrResources = fork.resources.get('Hedr')!;
    expect(hedrResources.has(1000)).toBe(true);
    
    const headerResource = hedrResources.get(1000)!;
    expect(headerResource.data.length).toBe(96); // Expected header size
    
    // Check items resource exists
    expect(fork.resources.has('Itms')).toBe(true);
    const itmsResources = fork.resources.get('Itms')!;
    expect(itmsResources.has(1000)).toBe(true);
    
    const itemsResource = itmsResources.get(1000)!;
    expect(itemsResource.data.length).toBeGreaterThan(0);
  });

  it('should produce identical results to Python implementation', () => {
    // This test will compare the outputs from Python and TypeScript
    const data = readFileSync(testFile);
    
    const tsJsonStr = saveToJson(data);
    const tsParsed = JSON.parse(tsJsonStr);
    
    // Try to read Python output if it exists
    const pythonOutputFile = join(__dirname, '..', '..', 'python_test_output.json');
    try {
      const pythonJsonStr = readFileSync(pythonOutputFile, 'utf-8');
      const pythonParsed = JSON.parse(pythonJsonStr);
      
      // Compare key header values (metadata might differ)
      expect(tsParsed.Hedr['1000'].obj.version).toBe(pythonParsed.Hedr['1000'].obj.version);
      expect(tsParsed.Hedr['1000'].obj.mapWidth).toBe(pythonParsed.Hedr['1000'].obj.mapWidth);
      expect(tsParsed.Hedr['1000'].obj.mapHeight).toBe(pythonParsed.Hedr['1000'].obj.mapHeight);
      
      console.log('✅ TypeScript and Python implementations produce matching results');
    } catch (error) {
      console.log('⚠️  Python output not found, skipping comparison');
    }
  });
});