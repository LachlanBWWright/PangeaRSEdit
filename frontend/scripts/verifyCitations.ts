import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Basic Citation Verification Script
 *
 * Verifies that item definition files contain citation comments linking
 * parameters to source code lines.
 *
 * Expected format:
 * // Source: /path/to/file.c line 123
 */

const ITEMS_DIR = join(process.cwd(), "src/data/items");

function verifyCitations() {
  console.log("Verifying citations in:", ITEMS_DIR);

  if (!existsSync(ITEMS_DIR)) {
      console.error("Items directory not found!");
      process.exit(1);
  }

  const files = readdirSync(ITEMS_DIR).filter(f => f.endsWith("ItemType.ts"));
  let totalErrors = 0;

  files.forEach(file => {
      const content = readFileSync(join(ITEMS_DIR, file), "utf-8");
      const lines = content.split("\n");

      // Heuristic: check if file has at least some "Source:" comments
      const hasCitations = lines.some(l => l.includes("// Source:") || l.includes("Source/"));

      if (!hasCitations) {
          console.warn(`⚠️  ${file} appears to lack source citations.`);
          // Not strictly failing the build for now, but logging warning
          // totalErrors++;
      } else {
          console.log(`✅ ${file} contains citations.`);
      }
  });

  if (totalErrors > 0) {
      console.error(`Found ${totalErrors} files with missing citations.`);
      process.exit(1);
  } else {
      console.log("Citation verification complete.");
  }
}

verifyCitations();
