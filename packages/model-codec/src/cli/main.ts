#!/usr/bin/env node
import { inspect } from "node:util";
import { parseModelCommand, MODEL_CLI_HELP, type ConversionOptions } from "./arguments";
import { convertModelFiles, inspectModelFile, type ModelConversionOptions } from "../node/conversion";
import { setCodecLogger } from "../logger";

function conversionOptions(options: ConversionOptions): ModelConversionOptions {
  return { model: options.model, skeleton: options.skeleton, skeletonOutput: options["skeleton-output"], target: options.target, force: options.force, allowLossy: options["allow-lossy"] };
}

const parsed = parseModelCommand(process.argv.slice(2));
if (parsed.isErr()) {
  process.stderr.write(`${parsed.error}\n`);
  process.exitCode = 2;
} else if (parsed.value.kind === "help") {
  process.stdout.write(MODEL_CLI_HELP);
} else {
  const command = parsed.value;
  if (command.options.verbose) setCodecLogger((level, values) => {
    const texts = values.map((value) => inspect(value, { depth: 3, customInspect: false }));
    process.stderr.write(`[${level}] ${texts.join(" ")}\n`);
  });
  const options = conversionOptions(command.options);
  if (command.kind === "inspect") {
    const result = await inspectModelFile(command.input, options);
    result.match((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`), (message) => { process.stderr.write(`${message}\n`); process.exitCode = 1; });
  } else {
    const result = await convertModelFiles(command.input, command.output, options);
    result.match((report) => {
      for (const warning of report.warnings) process.stderr.write(`Warning: ${warning}\n`);
      for (const path of report.files) process.stdout.write(`Wrote ${path}\n`);
    }, (message) => { process.stderr.write(`${message}\n`); process.exitCode = 1; });
  }
}
