/* global console, process */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const expectedIncludePatterns = [
  '"src/**/*.test.ts"',
  '"src/**/*.test.tsx"',
  '"tests/**/*.test.ts"',
  '"tests/**/*.test.tsx"',
];

const expectedAllowlist = ["tests/e2e/**", "tests/**/levels/**"];
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(frontendRoot, "vitest.config.ts");
const configText = readFileSync(configPath, "utf8");

const missingPatterns = expectedIncludePatterns.filter((pattern) => !configText.includes(pattern));
const missingAllowlist = expectedAllowlist.filter((pattern) => !configText.includes(pattern));

if (missingPatterns.length > 0 || missingAllowlist.length > 0) {
  const issues = [];

  if (missingPatterns.length > 0) {
    issues.push(
      `Missing include patterns in ${path.relative(process.cwd(), configPath)}: ${missingPatterns.join(", ")}`,
    );
  }

  if (missingAllowlist.length > 0) {
    issues.push(
      `Missing allowlist exclusions in ${path.relative(process.cwd(), configPath)}: ${missingAllowlist.join(", ")}`,
    );
  }

  console.error("Frontend test discovery check failed.");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }

    if (entry.isFile() && /\.test\.[jt]sx?$/.test(entry.name)) {
      files.push(path.relative(frontendRoot, absolutePath).replaceAll(path.sep, "/"));
    }
  }

  return files;
}

const testFiles = [
  ...walk(path.join(frontendRoot, "src")),
  ...walk(path.join(frontendRoot, "tests")),
].sort();

const allowlisted = (file) =>
  file.startsWith("tests/e2e/") ||
  file.startsWith("tests/mapRoundtrip/levels/") ||
  file.includes("/levels/") && file.startsWith("tests/");

const discoverableFiles = testFiles.filter((file) => !allowlisted(file));
console.log(
  `Frontend test discovery passes: ${discoverableFiles.length} test files are covered by the broad include globs and ${testFiles.length - discoverableFiles.length} intentionally excluded suites are allowlisted.`,
);
