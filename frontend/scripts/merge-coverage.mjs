import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import coverageLibrary from "istanbul-lib-coverage";
import reportLibrary from "istanbul-lib-report";
import reports from "istanbul-reports";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";

const coverageMapSchema = z.record(z.string(), z.unknown());
const { createCoverageMap } = coverageLibrary;
const { createContext } = reportLibrary;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const coverageRoot = path.join(frontendRoot, "coverage");
const unitPath = path.join(coverageRoot, "coverage-final.json");
const storybookPath = path.join(
  frontendRoot,
  "coverage-storybook",
  "coverage-final.json",
);
const combinedDir = path.join(frontendRoot, "coverage-combined");

const readCoverageMap = (filePath) =>
  ResultAsync.fromPromise(readFile(filePath, "utf8"), String)
    .andThen((contents) => {
      const parsed = Result.fromThrowable(
        (json) => JSON.parse(json),
        String,
      )(contents);
      return parsed.isOk() ? ok(parsed.value) : err(parsed.error);
    })
    .andThen((value) => {
      const parsed = coverageMapSchema.safeParse(value);
      return parsed.success ? ok(parsed.data) : err("Invalid coverage map schema");
    });

const mapsResult = await ResultAsync.combine([
  readCoverageMap(unitPath),
  readCoverageMap(storybookPath),
]);

if (mapsResult.isErr()) {
  process.stderr.write(`Coverage merge failed: ${mapsResult.error}\n`);
  process.exitCode = 1;
} else {
  const [unitCoverage, storybookCoverage] = mapsResult.value;
  const reportResult = await ResultAsync.fromPromise(
    (async () => {
      const coverageMap = createCoverageMap(unitCoverage);
      coverageMap.merge(storybookCoverage);
      await rm(combinedDir, { recursive: true, force: true });
      const context = createContext({ dir: combinedDir, coverageMap });
      for (const reporter of [
        "html",
        "json",
        "json-summary",
        "lcov",
        "text-summary",
      ]) {
        reports.create(reporter).execute(context);
      }
    })(),
    String,
  );
  if (reportResult.isErr()) {
    process.stderr.write(`Coverage merge failed: ${reportResult.error}\n`);
    process.exitCode = 1;
  }
}
