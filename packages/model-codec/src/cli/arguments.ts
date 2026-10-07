import { parseArgs } from "node:util";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";
import { boundaryMessage } from "../node/boundaries";

const optionsSchema = z.object({
  help: z.boolean().optional(), force: z.boolean().optional(), verbose: z.boolean().optional(),
  "allow-lossy": z.boolean().optional(), target: z.string().optional(),
  skeleton: z.string().optional(), model: z.string().optional(), "skeleton-output": z.string().optional(),
});

export type ConversionOptions = z.infer<typeof optionsSchema>;
export type ModelCommand = { kind: "help" } | { kind: "inspect"; input: string; options: ConversionOptions } | { kind: "convert"; input: string; output: string; options: ConversionOptions };

export function parseModelCommand(args: readonly string[]): Result<ModelCommand, string> {
  const parsed = Result.fromThrowable(() => parseArgs({ args: [...args], allowPositionals: true, strict: true, options: {
    help: { type: "boolean", short: "h" }, force: { type: "boolean", short: "f" }, verbose: { type: "boolean", short: "v" },
    "allow-lossy": { type: "boolean" }, target: { type: "string" }, skeleton: { type: "string" }, model: { type: "string" }, "skeleton-output": { type: "string" },
  } }), boundaryMessage)();
  if (parsed.isErr()) return err(parsed.error);
  const options = optionsSchema.safeParse(parsed.value.values);
  if (!options.success) return err(options.error.message);
  if (options.data.help || args.length === 0) return ok({ kind: "help" });
  const [kind, input, output] = parsed.value.positionals;
  if (kind === "inspect" && input && parsed.value.positionals.length === 2) return ok({ kind, input, options: options.data });
  if (kind === "convert" && input && output && parsed.value.positionals.length === 3) return ok({ kind, input, output, options: options.data });
  return err("Use convert <input> <output> or inspect <input>. See --help.");
}

export const MODEL_CLI_HELP = `Pangea model codec

  pangea-model convert <input> <output> [options]
  pangea-model inspect <input> [options]

Formats: .bg3d, .3dmf/.3df, .gltf, .glb and paired .skeleton.rsrc.
Companion skeletons are discovered automatically beside native models.

  --skeleton <file>         Override the input companion skeleton
  --model <file>            Geometry companion when input is a skeleton resource
  --skeleton-output <file>  Native animation resource destination (otherwise automatic)
  --target <game>           Skeleton alias target: ottomatic, bugdom, bugdom2,
                           cromag, nanosaur, nanosaur2, billyfrontier
  --allow-lossy            Permit reported native-format conversion losses
  --force, -f              Overwrite output files
  --verbose, -v            Print codec diagnostics to stderr
  --help, -h               Show this help

Examples:
  pangea-model convert Otto.bg3d Otto.glb
  pangea-model convert Otto.glb Edited.bg3d --target ottomatic
  pangea-model convert Rex.skeleton.rsrc Rex.gltf --model Rex.3dmf
  pangea-model inspect Rex.glb
`;
