/**
 * Tests for Citation Verification Engine
 */

import { describe, it, expect } from "vitest";
import {
  normalizeCode,
  calculateSimilarity,
  compareCode,
  findCodeInFile,
  summarizeResults,
  getFailedVerifications,
  getByStatus,
  VerificationStatus,
  type VerificationResult,
  type VerificationSummary,
} from "../../src/validation/citationVerifier";
import type { Citation } from "../../src/validation/citationExtractor";

describe("citationVerifier", () => {
  describe("normalizeCode", () => {
    it("should trim whitespace from lines", () => {
      const input = "  int x = 5;  ";
      expect(normalizeCode(input)).toBe("int x = 5;");
    });
    
    it("should remove C-style block comments", () => {
      const input = "int x /* comment */ = 5;";
      expect(normalizeCode(input)).toBe("int x = 5;");
    });
    
    it("should remove C++ style line comments", () => {
      const input = "int x = 5; // this is x";
      expect(normalizeCode(input)).toBe("int x = 5;");
    });
    
    it("should normalize multiple spaces", () => {
      const input = "int    x   =    5;";
      expect(normalizeCode(input)).toBe("int x = 5;");
    });
    
    it("should handle multi-line code", () => {
      const input = `
        int x = 5;
        int y = 10;
      `;
      expect(normalizeCode(input)).toBe("int x = 5; int y = 10;");
    });
    
    it("should remove empty lines", () => {
      const input = "int x = 5;\n\n\nint y = 10;";
      expect(normalizeCode(input)).toBe("int x = 5; int y = 10;");
    });
  });
  
  describe("calculateSimilarity", () => {
    it("should return 1 for identical strings", () => {
      expect(calculateSimilarity("hello", "hello")).toBe(1);
    });
    
    it("should return 0 for empty vs non-empty", () => {
      expect(calculateSimilarity("", "hello")).toBe(0);
      expect(calculateSimilarity("hello", "")).toBe(0);
    });
    
    it("should return 1 for strings that normalize to same", () => {
      expect(calculateSimilarity("  hello  ", "hello")).toBe(1);
    });
    
    it("should return value between 0 and 1 for different strings", () => {
      const similarity = calculateSimilarity("hello world", "hello there");
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });
  
  describe("compareCode", () => {
    it("should match identical code", () => {
      const result = compareCode("int x = 5;", "int x = 5;");
      expect(result.match).toBe(true);
      expect(result.similarity).toBe(1);
    });
    
    it("should match code with different whitespace", () => {
      const result = compareCode("int x=5;", "int x = 5;");
      expect(result.match).toBe(true);
    });
    
    it("should match when expected is contained in actual", () => {
      const result = compareCode("int x = 5;", "void foo() { int x = 5; return; }");
      expect(result.match).toBe(true);
    });
    
    it("should not match completely different code", () => {
      const result = compareCode("int x = 5;", "float y = 10.0;");
      expect(result.match).toBe(false);
      expect(result.similarity).toBeLessThan(0.9);
    });
  });
  
  describe("findCodeInFile", () => {
    const fileLines = [
      "// File header",
      "#include <stdio.h>",
      "",
      "void foo() {",
      "    int x = 5;",
      "    int y = 10;",
      "    return;",
      "}",
    ];
    
    it("should find code at the correct line", () => {
      const result = findCodeInFile("int x = 5;", fileLines);
      expect(result).not.toBeNull();
      expect(result?.lineNumber).toBe(5);
    });
    
    it("should return null for code not in file", () => {
      const result = findCodeInFile("float z = 15.0;", fileLines);
      expect(result).toBeNull();
    });
    
    it("should find multi-line code", () => {
      const result = findCodeInFile("int x = 5;\n    int y = 10;", fileLines);
      expect(result).not.toBeNull();
      expect(result?.lineNumber).toBe(5);
    });
  });
  
  describe("summarizeResults", () => {
    const createMockCitation = (game: string): Citation => ({
      game,
      itemType: "TestItem",
      itemTypeNumber: 1,
      parameterName: "p0",
      codeSample: { code: "test", fileName: "test.c", lineNumber: 1 },
      sourceFile: "test.ts",
    });
    
    const createMockResult = (status: VerificationStatus, game: string = "ottomatic"): VerificationResult => ({
      citation: createMockCitation(game),
      status,
    });
    
    it("should count verified results", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.CODE_CHANGED),
      ];
      
      const summary = summarizeResults(results);
      expect(summary.total).toBe(3);
      expect(summary.verified).toBe(2);
      expect(summary.codeChanged).toBe(1);
    });
    
    it("should track results by game", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED, "ottomatic"),
        createMockResult(VerificationStatus.VERIFIED, "bugdom"),
        createMockResult(VerificationStatus.CODE_CHANGED, "ottomatic"),
      ];
      
      const summary = summarizeResults(results);
      expect(summary.byGame["ottomatic"].total).toBe(2);
      expect(summary.byGame["ottomatic"].verified).toBe(1);
      expect(summary.byGame["ottomatic"].failures).toBe(1);
      expect(summary.byGame["bugdom"].total).toBe(1);
      expect(summary.byGame["bugdom"].verified).toBe(1);
    });
    
    it("should count all status types", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.PARTIAL_MATCH),
        createMockResult(VerificationStatus.CODE_CHANGED),
        createMockResult(VerificationStatus.FILE_NOT_FOUND),
        createMockResult(VerificationStatus.LINE_NOT_FOUND),
        createMockResult(VerificationStatus.NETWORK_ERROR),
        createMockResult(VerificationStatus.NO_REPOSITORY),
      ];
      
      const summary = summarizeResults(results);
      expect(summary.verified).toBe(1);
      expect(summary.partialMatches).toBe(1);
      expect(summary.codeChanged).toBe(1);
      expect(summary.fileNotFound).toBe(1);
      expect(summary.lineNotFound).toBe(1);
      expect(summary.networkErrors).toBe(1);
      expect(summary.noRepository).toBe(1);
    });
  });
  
  describe("getFailedVerifications", () => {
    const createMockCitation = (): Citation => ({
      game: "ottomatic",
      itemType: "TestItem",
      itemTypeNumber: 1,
      parameterName: "p0",
      codeSample: { code: "test", fileName: "test.c", lineNumber: 1 },
      sourceFile: "test.ts",
    });
    
    it("should filter out verified results", () => {
      const results: VerificationResult[] = [
        { citation: createMockCitation(), status: VerificationStatus.VERIFIED },
        { citation: createMockCitation(), status: VerificationStatus.CODE_CHANGED },
        { citation: createMockCitation(), status: VerificationStatus.FILE_NOT_FOUND },
      ];
      
      const failed = getFailedVerifications(results);
      expect(failed.length).toBe(2);
      expect(failed.every(r => r.status !== VerificationStatus.VERIFIED)).toBe(true);
    });
  });
  
  describe("getByStatus", () => {
    const createMockCitation = (): Citation => ({
      game: "ottomatic",
      itemType: "TestItem",
      itemTypeNumber: 1,
      parameterName: "p0",
      codeSample: { code: "test", fileName: "test.c", lineNumber: 1 },
      sourceFile: "test.ts",
    });
    
    it("should filter by specific status", () => {
      const results: VerificationResult[] = [
        { citation: createMockCitation(), status: VerificationStatus.VERIFIED },
        { citation: createMockCitation(), status: VerificationStatus.CODE_CHANGED },
        { citation: createMockCitation(), status: VerificationStatus.CODE_CHANGED },
      ];
      
      const codeChanged = getByStatus(results, VerificationStatus.CODE_CHANGED);
      expect(codeChanged.length).toBe(2);
      expect(codeChanged.every(r => r.status === VerificationStatus.CODE_CHANGED)).toBe(true);
    });
  });
});
