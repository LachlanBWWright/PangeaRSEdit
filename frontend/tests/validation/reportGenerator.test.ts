/**
 * Tests for Report Generator
 */

import { describe, it, expect } from "vitest";
import {
  generateReport,
  generateMarkdownReport,
  generateJsonReport,
  generateTextReport,
  suggestFixes,
} from "../../src/validation/reportGenerator";
import { VerificationStatus, type VerificationResult } from "../../src/validation/citationVerifier";
import type { Citation } from "../../src/validation/citationExtractor";

describe("reportGenerator", () => {
  const createMockCitation = (game = "ottomatic", itemType = "TestItem"): Citation => ({
    game,
    itemType,
    itemTypeNumber: 1,
    parameterName: "p0",
    codeSample: {
      code: "int x = 5;",
      fileName: "Items/Items.c",
      lineNumber: 100,
    },
    sourceFile: "test.ts",
  });
  
  const createMockResult = (
    status: VerificationStatus,
    options: Partial<{
      game: string;
      itemType: string;
      actualCode: string;
      actualLineNumber: number;
      similarity: number;
      message: string;
    }> = {}
  ): VerificationResult => ({
    citation: createMockCitation(options.game, options.itemType),
    status,
    actualCode: options.actualCode,
    actualLineNumber: options.actualLineNumber,
    similarity: options.similarity,
    message: options.message,
  });
  
  describe("generateReport", () => {
    it("should generate a report with correct timestamp", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
      ];
      
      const report = generateReport(results);
      
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.allResults).toHaveLength(1);
    });
    
    it("should separate failures and partial matches", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.PARTIAL_MATCH),
        createMockResult(VerificationStatus.CODE_CHANGED),
        createMockResult(VerificationStatus.FILE_NOT_FOUND),
      ];
      
      const report = generateReport(results);
      
      expect(report.summary.verified).toBe(1);
      expect(report.partialMatches).toHaveLength(1);
      expect(report.failures).toHaveLength(2);
    });
    
    it("should include summary statistics", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED, { game: "ottomatic" }),
        createMockResult(VerificationStatus.VERIFIED, { game: "bugdom" }),
        createMockResult(VerificationStatus.CODE_CHANGED, { game: "ottomatic" }),
      ];
      
      const report = generateReport(results);
      
      expect(report.summary.total).toBe(3);
      expect(report.summary.verified).toBe(2);
      expect(report.summary.byGame["ottomatic"].total).toBe(2);
      expect(report.summary.byGame["bugdom"].total).toBe(1);
    });
  });
  
  describe("generateMarkdownReport", () => {
    it("should generate valid markdown with header", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
      ];
      const report = generateReport(results);
      
      const markdown = generateMarkdownReport(report);
      
      expect(markdown).toContain("# Citation Verification Report");
      expect(markdown).toContain("## Summary");
      expect(markdown).toContain("## Results by Game");
    });
    
    it("should include summary table", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.CODE_CHANGED),
      ];
      const report = generateReport(results);
      
      const markdown = generateMarkdownReport(report);
      
      expect(markdown).toContain("| Status | Count |");
      expect(markdown).toContain("✅ Verified");
      expect(markdown).toContain("❌ Code Changed");
    });
    
    it("should include partial matches section when present", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.PARTIAL_MATCH, {
          actualLineNumber: 150,
          message: "Code found at different line",
        }),
      ];
      const report = generateReport(results);
      
      const markdown = generateMarkdownReport(report);
      
      expect(markdown).toContain("## Partial Matches");
      expect(markdown).toContain("Expected Line:** 100");
      expect(markdown).toContain("Actual Line:** 150");
    });
    
    it("should include failures section when present", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.CODE_CHANGED, {
          actualCode: "int y = 10;",
          similarity: 0.75,
        }),
      ];
      const report = generateReport(results);
      
      const markdown = generateMarkdownReport(report);
      
      expect(markdown).toContain("## Failures");
      expect(markdown).toContain("**Expected Code:**");
      expect(markdown).toContain("**Actual Code:**");
      expect(markdown).toContain("75.0%");
    });
  });
  
  describe("generateJsonReport", () => {
    it("should generate valid JSON", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
      ];
      const report = generateReport(results);
      
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("summary");
      expect(parsed).toHaveProperty("failures");
      expect(parsed).toHaveProperty("partialMatches");
    });
    
    it("should include correct summary data", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.CODE_CHANGED),
      ];
      const report = generateReport(results);
      
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);
      
      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.verified).toBe(1);
    });
    
    it("should format failures correctly", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.CODE_CHANGED, {
          game: "bugdom",
          itemType: "Enemy",
          similarity: 0.8,
        }),
      ];
      const report = generateReport(results);
      
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);
      
      expect(parsed.failures).toHaveLength(1);
      expect(parsed.failures[0].game).toBe("bugdom");
      expect(parsed.failures[0].itemType).toBe("Enemy");
      expect(parsed.failures[0].similarity).toBe(0.8);
    });
  });
  
  describe("generateTextReport", () => {
    it("should generate plain text report", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
      ];
      const report = generateReport(results);
      
      const text = generateTextReport(report);
      
      expect(text).toContain("CITATION VERIFICATION REPORT");
      expect(text).toContain("SUMMARY");
      expect(text).toContain("BY GAME");
    });
    
    it("should include statistics", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.VERIFIED),
        createMockResult(VerificationStatus.CODE_CHANGED),
      ];
      const report = generateReport(results);
      
      const text = generateTextReport(report);
      
      expect(text).toContain("Total Citations:    3");
      expect(text).toContain("Verified:           2");
      expect(text).toContain("Code Changed:       1");
    });
    
    it("should include failures section", () => {
      const results: VerificationResult[] = [
        createMockResult(VerificationStatus.FILE_NOT_FOUND, {
          message: "File not found",
        }),
      ];
      const report = generateReport(results);
      
      const text = generateTextReport(report);
      
      expect(text).toContain("FAILURES");
      expect(text).toContain("File Not Found");
    });
  });
  
  describe("suggestFixes", () => {
    it("should suggest line update for partial matches", () => {
      const failures: VerificationResult[] = [
        createMockResult(VerificationStatus.PARTIAL_MATCH, {
          actualLineNumber: 150,
        }),
      ];
      
      const fixes = suggestFixes(failures);
      
      expect(fixes).toHaveLength(1);
      expect(fixes[0].action).toBe("update_line");
      expect(fixes[0].suggestedLineNumber).toBe(150);
    });
    
    it("should suggest code update for changed code", () => {
      const failures: VerificationResult[] = [
        createMockResult(VerificationStatus.CODE_CHANGED, {
          actualCode: "int y = 10;",
        }),
      ];
      
      const fixes = suggestFixes(failures);
      
      expect(fixes).toHaveLength(1);
      expect(fixes[0].action).toBe("update_code");
      expect(fixes[0].suggestedCode).toBe("int y = 10;");
    });
    
    it("should suggest investigation for file not found", () => {
      const failures: VerificationResult[] = [
        createMockResult(VerificationStatus.FILE_NOT_FOUND),
      ];
      
      const fixes = suggestFixes(failures);
      
      expect(fixes).toHaveLength(1);
      expect(fixes[0].action).toBe("investigate");
      expect(fixes[0].reason).toContain("not found");
    });
    
    it("should suggest investigation for line not found", () => {
      const failures: VerificationResult[] = [
        createMockResult(VerificationStatus.LINE_NOT_FOUND),
      ];
      
      const fixes = suggestFixes(failures);
      
      expect(fixes).toHaveLength(1);
      expect(fixes[0].action).toBe("investigate");
      expect(fixes[0].reason).toContain("exceeds file length");
    });
    
    it("should handle multiple failures", () => {
      const failures: VerificationResult[] = [
        createMockResult(VerificationStatus.PARTIAL_MATCH, { actualLineNumber: 150 }),
        createMockResult(VerificationStatus.CODE_CHANGED),
        createMockResult(VerificationStatus.FILE_NOT_FOUND),
      ];
      
      const fixes = suggestFixes(failures);
      
      expect(fixes).toHaveLength(3);
      expect(fixes[0].action).toBe("update_line");
      expect(fixes[1].action).toBe("update_code");
      expect(fixes[2].action).toBe("investigate");
    });
  });
});
