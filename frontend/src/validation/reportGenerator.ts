/**
 * Report Generator
 * 
 * Generates human-readable reports from citation verification results.
 * Supports multiple output formats: text, markdown, and JSON.
 */

import {
  VerificationResult,
  VerificationStatus,
  VerificationSummary,
  summarizeResults,
} from "./citationVerifier";
import { getGitHubPermalink } from "./gameRepositories";

/**
 * Full verification report
 */
export interface VerificationReport {
  timestamp: Date;
  summary: VerificationSummary;
  failures: VerificationResult[];
  partialMatches: VerificationResult[];
  allResults: VerificationResult[];
}

/**
 * Generate a verification report from results
 */
export function generateReport(results: VerificationResult[]): VerificationReport {
  const summary = summarizeResults(results);
  
  return {
    timestamp: new Date(),
    summary,
    failures: results.filter(r => 
      r.status !== VerificationStatus.VERIFIED && 
      r.status !== VerificationStatus.PARTIAL_MATCH
    ),
    partialMatches: results.filter(r => r.status === VerificationStatus.PARTIAL_MATCH),
    allResults: results,
  };
}

/**
 * Generate a markdown report
 */
export function generateMarkdownReport(report: VerificationReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push("# Citation Verification Report");
  lines.push("");
  lines.push(`**Generated:** ${report.timestamp.toISOString()}`);
  lines.push("");
  
  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| ✅ Verified | ${report.summary.verified} |`);
  lines.push(`| ⚠️ Partial Match | ${report.summary.partialMatches} |`);
  lines.push(`| ❌ Code Changed | ${report.summary.codeChanged} |`);
  lines.push(`| 📁 File Not Found | ${report.summary.fileNotFound} |`);
  lines.push(`| 📍 Line Not Found | ${report.summary.lineNotFound} |`);
  lines.push(`| 🌐 Network Error | ${report.summary.networkErrors} |`);
  lines.push(`| ❓ No Repository | ${report.summary.noRepository} |`);
  lines.push(`| **Total** | **${report.summary.total}** |`);
  lines.push("");
  
  // By Game
  lines.push("## Results by Game");
  lines.push("");
  lines.push(`| Game | Total | Verified | Failures | Success Rate |`);
  lines.push(`|------|-------|----------|----------|--------------|`);
  
  for (const [game, stats] of Object.entries(report.summary.byGame)) {
    const successRate = stats.total > 0 
      ? ((stats.verified / stats.total) * 100).toFixed(1) 
      : "N/A";
    lines.push(`| ${game} | ${stats.total} | ${stats.verified} | ${stats.failures} | ${successRate}% |`);
  }
  lines.push("");
  
  // Partial Matches
  if (report.partialMatches.length > 0) {
    lines.push("## Partial Matches (Line Number Changes)");
    lines.push("");
    lines.push("These citations exist in the source code but at different line numbers:");
    lines.push("");
    
    for (const result of report.partialMatches) {
      const { citation, actualLineNumber, message } = result;
      const permalink = getGitHubPermalink(
        citation.game,
        citation.codeSample.fileName,
        actualLineNumber ?? citation.codeSample.lineNumber
      );
      
      lines.push(`### ${citation.game} - ${citation.itemType} (${citation.parameterName})`);
      lines.push("");
      lines.push(`- **File:** \`${citation.codeSample.fileName}\``);
      lines.push(`- **Expected Line:** ${citation.codeSample.lineNumber}`);
      lines.push(`- **Actual Line:** ${actualLineNumber ?? "Unknown"}`);
      if (permalink) {
        lines.push(`- **Link:** [View on GitHub](${permalink})`);
      }
      if (message) {
        lines.push(`- **Note:** ${message}`);
      }
      lines.push("");
    }
  }
  
  // Failures
  if (report.failures.length > 0) {
    lines.push("## Failures");
    lines.push("");
    lines.push("These citations need attention:");
    lines.push("");
    
    for (const result of report.failures) {
      const { citation, status, message, similarity } = result;
      
      lines.push(`### ${citation.game} - ${citation.itemType} (${citation.parameterName})`);
      lines.push("");
      lines.push(`- **Status:** ${formatStatus(status)}`);
      lines.push(`- **File:** \`${citation.codeSample.fileName}\``);
      lines.push(`- **Line:** ${citation.codeSample.lineNumber}`);
      if (similarity !== undefined) {
        lines.push(`- **Similarity:** ${(similarity * 100).toFixed(1)}%`);
      }
      if (message) {
        lines.push(`- **Message:** ${message}`);
      }
      lines.push("");
      lines.push("**Expected Code:**");
      lines.push("```c");
      lines.push(citation.codeSample.code);
      lines.push("```");
      lines.push("");
      if (result.actualCode) {
        lines.push("**Actual Code:**");
        lines.push("```c");
        lines.push(result.actualCode);
        lines.push("```");
        lines.push("");
      }
    }
  }
  
  return lines.join("\n");
}

/**
 * Generate a JSON report
 */
export function generateJsonReport(report: VerificationReport): string {
  return JSON.stringify({
    timestamp: report.timestamp.toISOString(),
    summary: {
      total: report.summary.total,
      verified: report.summary.verified,
      partialMatches: report.summary.partialMatches,
      failures: report.summary.total - report.summary.verified - report.summary.partialMatches,
      byGame: report.summary.byGame,
    },
    partialMatches: report.partialMatches.map(formatResultForJson),
    failures: report.failures.map(formatResultForJson),
  }, null, 2);
}

/**
 * Generate a plain text report
 */
export function generateTextReport(report: VerificationReport): string {
  const lines: string[] = [];
  
  lines.push("========================================");
  lines.push("CITATION VERIFICATION REPORT");
  lines.push("========================================");
  lines.push("");
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push("--------");
  lines.push(`Total Citations:    ${report.summary.total}`);
  lines.push(`Verified:           ${report.summary.verified}`);
  lines.push(`Partial Matches:    ${report.summary.partialMatches}`);
  lines.push(`Code Changed:       ${report.summary.codeChanged}`);
  lines.push(`File Not Found:     ${report.summary.fileNotFound}`);
  lines.push(`Line Not Found:     ${report.summary.lineNotFound}`);
  lines.push(`Network Errors:     ${report.summary.networkErrors}`);
  lines.push(`No Repository:      ${report.summary.noRepository}`);
  lines.push("");
  
  const successRate = report.summary.total > 0
    ? ((report.summary.verified / report.summary.total) * 100).toFixed(1)
    : "N/A";
  lines.push(`Success Rate: ${successRate}%`);
  lines.push("");
  
  lines.push("BY GAME");
  lines.push("--------");
  for (const [game, stats] of Object.entries(report.summary.byGame)) {
    const rate = stats.total > 0 
      ? ((stats.verified / stats.total) * 100).toFixed(1)
      : "N/A";
    lines.push(`${game}: ${stats.verified}/${stats.total} (${rate}%)`);
  }
  lines.push("");
  
  if (report.failures.length > 0) {
    lines.push("FAILURES");
    lines.push("--------");
    for (const result of report.failures) {
      lines.push(`[${result.citation.game}] ${result.citation.itemType}.${result.citation.parameterName}`);
      lines.push(`  Status: ${formatStatus(result.status)}`);
      lines.push(`  File: ${result.citation.codeSample.fileName}:${result.citation.codeSample.lineNumber}`);
      if (result.message) {
        lines.push(`  Message: ${result.message}`);
      }
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

/**
 * Format verification status for display
 */
function formatStatus(status: VerificationStatus): string {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return "✅ Verified";
    case VerificationStatus.PARTIAL_MATCH:
      return "⚠️ Partial Match";
    case VerificationStatus.CODE_CHANGED:
      return "❌ Code Changed";
    case VerificationStatus.FILE_NOT_FOUND:
      return "📁 File Not Found";
    case VerificationStatus.LINE_NOT_FOUND:
      return "📍 Line Not Found";
    case VerificationStatus.NETWORK_ERROR:
      return "🌐 Network Error";
    case VerificationStatus.NO_REPOSITORY:
      return "❓ No Repository";
  }
}

/**
 * Format a result for JSON output
 */
function formatResultForJson(result: VerificationResult): object {
  return {
    game: result.citation.game,
    itemType: result.citation.itemType,
    itemTypeNumber: result.citation.itemTypeNumber,
    parameter: result.citation.parameterName,
    status: result.status,
    file: result.citation.codeSample.fileName,
    expectedLine: result.citation.codeSample.lineNumber,
    actualLine: result.actualLineNumber,
    similarity: result.similarity,
    message: result.message,
  };
}

/**
 * Suggested fixes for failed citations
 */
export interface CitationFix {
  citation: {
    game: string;
    itemType: string;
    parameterName: string;
    sourceFile: string;
  };
  suggestedLineNumber: number | null;
  suggestedCode: string | null;
  action: "update_line" | "update_code" | "remove" | "investigate";
  reason: string;
}

/**
 * Generate suggested fixes for failed verifications
 */
export function suggestFixes(failures: VerificationResult[]): CitationFix[] {
  const fixes: CitationFix[] = [];
  
  for (const failure of failures) {
    const { citation, status, actualLineNumber, actualCode } = failure;
    
    let fix: CitationFix;
    
    switch (status) {
      case VerificationStatus.PARTIAL_MATCH:
        fix = {
          citation: {
            game: citation.game,
            itemType: citation.itemType,
            parameterName: citation.parameterName,
            sourceFile: citation.sourceFile,
          },
          suggestedLineNumber: actualLineNumber ?? null,
          suggestedCode: null,
          action: "update_line",
          reason: `Code found at line ${actualLineNumber} instead of ${citation.codeSample.lineNumber}`,
        };
        break;
        
      case VerificationStatus.CODE_CHANGED:
        fix = {
          citation: {
            game: citation.game,
            itemType: citation.itemType,
            parameterName: citation.parameterName,
            sourceFile: citation.sourceFile,
          },
          suggestedLineNumber: citation.codeSample.lineNumber,
          suggestedCode: actualCode ?? null,
          action: "update_code",
          reason: "Code at specified line has changed",
        };
        break;
        
      case VerificationStatus.FILE_NOT_FOUND:
        fix = {
          citation: {
            game: citation.game,
            itemType: citation.itemType,
            parameterName: citation.parameterName,
            sourceFile: citation.sourceFile,
          },
          suggestedLineNumber: null,
          suggestedCode: null,
          action: "investigate",
          reason: `File ${citation.codeSample.fileName} not found - may have been moved or renamed`,
        };
        break;
        
      case VerificationStatus.LINE_NOT_FOUND:
        fix = {
          citation: {
            game: citation.game,
            itemType: citation.itemType,
            parameterName: citation.parameterName,
            sourceFile: citation.sourceFile,
          },
          suggestedLineNumber: null,
          suggestedCode: null,
          action: "investigate",
          reason: `Line ${citation.codeSample.lineNumber} exceeds file length`,
        };
        break;
        
      default:
        fix = {
          citation: {
            game: citation.game,
            itemType: citation.itemType,
            parameterName: citation.parameterName,
            sourceFile: citation.sourceFile,
          },
          suggestedLineNumber: null,
          suggestedCode: null,
          action: "investigate",
          reason: `Status: ${status}`,
        };
    }
    
    fixes.push(fix);
  }
  
  return fixes;
}
