/**
 * Analyze byte-level discrepancies in skeleton roundtrip
 * 
 * This test performs a detailed byte-by-byte analysis to identify
 * exactly where the differences are occurring in the roundtrip files.
 */

import { describe, it } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary, setFinderInfo } from "./skeletonBinaryExport";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { unpackAdf } from "../rsrcdump-ts/adf";

describe("Byte Discrepancy Analysis", () => {
  it("should analyze byte-level differences in skeleton roundtrip", async () => {
    console.log("\n" + "=".repeat(80));
    console.log("BYTE DISCREPANCY ANALYSIS");
    console.log("=".repeat(80));

    const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
    const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");

    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    console.log(`\nOriginal files:`);
    console.log(`  BG3D: ${originalBg3dData.length} bytes`);
    console.log(`  Skeleton: ${originalSkeletonData.length} bytes`);

    // Extract Finder Info
    const adfEntries = unpackAdf(new Uint8Array(originalSkeletonData));
    const originalFinderInfo = adfEntries.get(9);
    if (originalFinderInfo) {
      setFinderInfo(originalFinderInfo);
    }

    // Perform simple parse and re-export without glTF conversion
    // This tests if the parser/exporter themselves are byte-accurate
    const skeletonParsed = parseSkeletonRsrc(new Uint8Array(originalSkeletonData).buffer, { usePyodide: false });
    const bg3dParsed = parseBG3D(originalBg3dData.buffer, skeletonParsed);

    console.log(`\nRe-exporting skeleton resource (parse → export, no glTF)...`);
    const skeletonResource = bg3dSkeletonToSkeletonResource(bg3dParsed);
    const roundtripSkeletonData = skeletonResourceToBinary(skeletonResource, { usePyodide: false });

    console.log(`\nRoundtrip files:`);
    console.log(`  Skeleton: ${roundtripSkeletonData.byteLength} bytes`);

    const origBytes = new Uint8Array(originalSkeletonData);
    const rtBytes = new Uint8Array(roundtripSkeletonData);

    // Write roundtrip file for external analysis
    const rtPath = join(__dirname, "../../public/Otto.skeleton.roundtrip.rsrc");
    writeFileSync(rtPath, rtBytes);
    console.log(`\n✓ Wrote roundtrip file to: ${rtPath}`);

    // Byte-by-byte comparison
    const minLen = Math.min(origBytes.length, rtBytes.length);
    let matchingBytes = 0;
    const mismatchRanges: Array<{start: number, end: number, count: number}> = [];
    let currentRange: {start: number, end: number, count: number} | null = null;

    console.log(`\n${"=".repeat(80)}`);
    console.log("BYTE-BY-BYTE COMPARISON");
    console.log("=".repeat(80));

    for (let i = 0; i < minLen; i++) {
      if (origBytes[i] === rtBytes[i]) {
        matchingBytes++;
        if (currentRange) {
          currentRange.end = i - 1;
          mismatchRanges.push(currentRange);
          currentRange = null;
        }
      } else {
        if (!currentRange) {
          currentRange = {start: i, end: i, count: 1};
        } else {
          currentRange.end = i;
          currentRange.count++;
        }
      }
    }

    if (currentRange) {
      mismatchRanges.push(currentRange);
    }

    const byteAccuracy = matchingBytes / minLen;
    console.log(`\nOverall byte accuracy: ${(byteAccuracy * 100).toFixed(2)}%`);
    console.log(`Matching bytes: ${matchingBytes} / ${minLen}`);
    console.log(`Mismatching bytes: ${minLen - matchingBytes}`);

    if (origBytes.length !== rtBytes.length) {
      console.log(`\n⚠️  SIZE MISMATCH:`);
      console.log(`  Original: ${origBytes.length} bytes`);
      console.log(`  Roundtrip: ${rtBytes.length} bytes`);
      console.log(`  Difference: ${rtBytes.length - origBytes.length} bytes`);
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`MISMATCH RANGES (${mismatchRanges.length} total)`);
    console.log("=".repeat(80));

    // Show first 20 mismatch ranges in detail
    const maxRangesToShow = 20;
    for (let i = 0; i < Math.min(maxRangesToShow, mismatchRanges.length); i++) {
      const range = mismatchRanges[i];
      const size = range.end - range.start + 1;
      console.log(`\nRange ${i + 1}: Offset 0x${range.start.toString(16).padStart(4, '0')} - 0x${range.end.toString(16).padStart(4, '0')} (${size} bytes)`);
      
      // Show first few bytes of each
      const showBytes = Math.min(16, size);
      const origSample = Array.from(origBytes.slice(range.start, range.start + showBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      const rtSample = Array.from(rtBytes.slice(range.start, range.start + showBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      console.log(`  Original:  ${origSample}${size > showBytes ? '...' : ''}`);
      console.log(`  Roundtrip: ${rtSample}${size > showBytes ? '...' : ''}`);

      // Try to identify what resource this might be in
      if (range.start > 120) {  // After AppleDouble header
        const resourceForOffset = range.start - 120;
        console.log(`  (Resource fork offset: 0x${resourceForOffset.toString(16)})`);
      }
    }

    if (mismatchRanges.length > maxRangesToShow) {
      console.log(`\n... and ${mismatchRanges.length - maxRangesToShow} more mismatch ranges`);
    }

    // Analyze mismatch distribution
    console.log(`\n${"=".repeat(80)}`);
    console.log("MISMATCH DISTRIBUTION");
    console.log("=".repeat(80));

    const sizeCategories = {
      'single': 0,  // 1 byte
      'small': 0,   // 2-10 bytes
      'medium': 0,  // 11-100 bytes
      'large': 0,   // 101+ bytes
    };

    mismatchRanges.forEach(range => {
      const size = range.end - range.start + 1;
      if (size === 1) sizeCategories.single++;
      else if (size <= 10) sizeCategories.small++;
      else if (size <= 100) sizeCategories.medium++;
      else sizeCategories.large++;
    });

    console.log(`\nMismatch range sizes:`);
    console.log(`  Single byte:    ${sizeCategories.single} ranges`);
    console.log(`  Small (2-10):   ${sizeCategories.small} ranges`);
    console.log(`  Medium (11-100):${sizeCategories.medium} ranges`);
    console.log(`  Large (101+):   ${sizeCategories.large} ranges`);

    // Check AppleDouble header  
    console.log(`\n${"=".repeat(80)}`);
    console.log("APPLEDOUBLE HEADER ANALYSIS");
    console.log("=".repeat(80));

    const adfHeaderSize = 120;
    let adfMatches = 0;
    for (let i = 0; i < adfHeaderSize && i < minLen; i++) {
      if (origBytes[i] === rtBytes[i]) adfMatches++;
    }
    console.log(`\nAppleDouble header (first 120 bytes):`);
    console.log(`  Matching: ${adfMatches} / ${adfHeaderSize} (${(adfMatches / adfHeaderSize * 100).toFixed(2)}%)`);

    // Check resource fork data
    console.log(`\n${"=".repeat(80)}`);
    console.log("RESOURCE FORK ANALYSIS");
    console.log("=".repeat(80));

    if (minLen > adfHeaderSize) {
      let rfMatches = 0;
      for (let i = adfHeaderSize; i < minLen; i++) {
        if (origBytes[i] === rtBytes[i]) rfMatches++;
      }
      const rfSize = minLen - adfHeaderSize;
      console.log(`\nResource fork data (after byte 120):`);
      console.log(`  Matching: ${rfMatches} / ${rfSize} (${(rfMatches / rfSize * 100).toFixed(2)}%)`);
    }
  });
});
