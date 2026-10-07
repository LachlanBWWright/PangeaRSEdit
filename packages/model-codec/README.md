# Pangea model codec

`@pangea/model-codec` converts Pangea BG3D, 3DMF (`.3dmf` or `.3df`), and companion skeleton resources to and from glTF 2.0 (`.gltf` or `.glb`). It contains the editor's model codecs without React or editor UI dependencies, plus a Node CLI and filesystem APIs. This is currently a private workspace package.

## Run from this repository

From the repository root:

```sh
pnpm install
pnpm --filter @pangea/model-codec check
pnpm --filter @pangea/model-codec lint
pnpm --filter @pangea/model-codec test
pnpm --filter @pangea/model-codec build
node packages/model-codec/dist/cli.js --help
```

During development, run the source CLI without building:

```sh
pnpm --filter @pangea/model-codec cli inspect path/to/Blob.bg3d
# Equivalent shortcut from the repository root:
pnpm model-codec inspect path/to/Blob.bg3d
```

The built CLI is exposed as `pangea-model` where the workspace package's executable is linked. The examples below use that name; `node packages/model-codec/dist/cli.js` is equivalent when run from the repository root.

## Commands and options

```text
pangea-model convert <input> <output> [options]
pangea-model inspect <input> [options]
```

The output extension chooses the output format. `inspect` writes a JSON summary of scenes, meshes, vertices, materials, textures, skins, animation channels, and discovered companions.

| Option | Meaning |
| --- | --- |
| `--skeleton <file>` | Select a native geometry input's skeleton companion explicitly. |
| `--model <file>` | Select geometry when the input itself is a skeleton resource. |
| `--skeleton-output <file>` | Choose the skeleton destination for native output containing animation. |
| `--target <game>` | Choose the native skeleton alias target; see the table below. |
| `--allow-lossy` | Accept the reported compatibility changes when converting glTF to native formats. |
| `--force`, `-f` | Overwrite existing output files. Input files remain protected. |
| `--verbose`, `-v` | Send codec diagnostics to stderr. Logging is quiet by default. |
| `--help`, `-h` | Show command help. |

`--model` and `--skeleton` apply to native inputs, and cannot be used with glTF inputs. `--target` and `--skeleton-output` apply only to native outputs. Supplying `--skeleton-output` for a model without a skeleton is an error.

Native target defaults depend on the output format: `ottomatic` for BG3D and `bugdom` for 3DMF. The target selects skeleton alias conventions; it does not validate every restriction of the destination game's runtime.

| Native geometry output | Supported target IDs |
| --- | --- |
| `.bg3d` | `ottomatic`, `cromag`, `bugdom2`, `nanosaur2`, `billyfrontier` |
| `.3dmf`, `.3df` | `bugdom`, `nanosaur` |

A target requiring BG3D cannot be combined with a 3DMF output, or vice versa.

Successful conversions print written paths to stdout and compatibility warnings to stderr. Exit codes are `0` for success, `1` for conversion or inspection failure, and `2` for invalid command arguments.

## Native models and companion skeletons

```sh
# Finds Blob.skeleton.rsrc or Blob.skeleton beside Blob.bg3d.
pangea-model convert assets/Blob.bg3d exports/Blob.glb

# Select a companion from another directory.
pangea-model convert assets/Blob.bg3d exports/Blob.gltf \
  --skeleton assets/skeletons/Blob.skeleton.rsrc

# 3DMF geometry works with either supported extension.
pangea-model convert assets/Rex.3df exports/Rex.glb

# Start from the skeleton and select its geometry explicitly.
pangea-model convert assets/Rex.skeleton.rsrc exports/Rex.gltf \
  --model assets/geometry/Rex.3dmf

pangea-model inspect assets/Blob.bg3d
```

Autodiscovery searches the input's directory and compares filenames without case sensitivity. For geometry inputs, it looks for `<stem>.skeleton.rsrc` and `<stem>.skeleton`. For skeleton inputs ending in `.skeleton.rsrc`, `.skeleton`, or `.rsrc`, it looks for `<stem>.bg3d`, `<stem>.3dmf`, and `<stem>.3df`. Multiple matches are an error; use the appropriate explicit companion option to resolve them. A geometry input can be used without a skeleton, but a skeleton input requires geometry.

Native output with a skeleton writes two files: the requested geometry and, by default, `<output-stem>.skeleton.rsrc` beside it.

```sh
pangea-model convert exports/Blob.glb edited/Blob.bg3d --target ottomatic

pangea-model convert exports/Rex.glb edited/Rex.3df --target nanosaur \
  --skeleton-output edited/skeletons/Rex.skeleton.rsrc
```

The CLI creates output directories and checks all destinations before writing. It rejects existing destinations unless `--force` is supplied, and rejects destinations that would overwrite its native input or companion.

## glTF files and external resources

Node input uses glTF-Transform's `NodeIO`, which loads local `.gltf` buffer and image references relative to the input file. Keep the referenced `.bin` and texture files available alongside their declared paths. Embedded resources and `.glb` inputs are also supported.

```sh
pangea-model inspect scene/model.gltf
pangea-model convert scene/model.gltf exports/model.glb
pangea-model convert exports/model.glb exports/model.gltf
```

`.glb` output is a single binary file. `.gltf` output writes JSON plus a sibling `<output-stem>.resources` directory containing buffers and textures. Move or distribute that directory together with the JSON file. `--force` also applies to those generated resource files.

## Reversibility and compatibility limits

Conversions preserve supported mesh, material, bone, and animation data. Native-specific information is carried in glTF `extras` where available. Keep those extras when editing or processing the exported glTF: tools that discard them can remove material flags, native texture information, geometry metadata, or animation event information needed on return.

Exported glTF carries native group hierarchy and mesh identifiers in `extras`. Retaining them preserves model order and empty model slots on return; newly added meshes become additional models. External glTF without this metadata imports as a single model group.

Roundtrips are semantic conversions, not byte-for-byte restoration. Textures may be decoded or re-encoded, and animation representations differ between glTF and the games. Skeleton resource aliases are regenerated for the selected output target and model name. Unknown 3DMF chunks are not retained, and deep BG3D nesting may be flattened when converting to 3DMF.

Native formats support a narrower feature set than glTF. The compatibility pass reports changes including:

- Selecting the default scene, omitting cameras, and simplifying unsupported node transforms.
- Keeping base color while omitting richer material features such as normal, emissive, occlusion, and metallic/roughness inputs.
- Triangulating strips and fans, dropping unsupported primitives, and omitting extra UV sets, tangents, or morph targets.
- Reducing smooth skinning to the highest-weight bone per vertex, and omitting additional skinning attribute sets.
- Omitting unsupported animation channels and optional extensions that do not map to native formats.

Conversion from glTF to native output stops if the compatibility pass reports changes, unless `--allow-lossy` is supplied:

```sh
pangea-model convert scene/model.glb exports/model.bg3d \
  --target ottomatic --allow-lossy
```

The accepted changes are still printed as warnings. `--allow-lossy` does not make unsupported required extensions, missing resources, or invalid assets convertible, and the absence of warnings is not a guarantee of byte-identical roundtripping or compatibility with every game.

## Library entry points

Use `@pangea/model-codec` for filesystem-independent codecs and conversions between buffers, parsed model data, and glTF-Transform `Document` objects. This core entry is intended for bundler-based browser integrations as well as Node callers. It does not provide editor workers, UI, or filesystem resource discovery.

Use `@pangea/model-codec/node` for filesystem loading, companion discovery, inspection, and conversion with external glTF resources. Do not include that entry in browser bundles.

Recoverable parse and I/O failures use `neverthrow`:

| API | Return type |
| --- | --- |
| `parseBG3D(buffer)` | `Result<BG3DParseResult, string>` |
| `parse3DMF(buffer)` | `Result<BG3DParseResult, string>` |
| `parseSkeletonRsrcResult(buffer)` | `ResultAsync<SkeletonResource, string>` |
| `parseSkeletonRsrcJsonResult(buffer)` | `ResultAsync<ParsedSkeleton, string>` |
| `skeletonResourceToBinary(resource)` | `Result<ArrayBuffer, string>` |
| `parseBG3DWithSkeleton(modelBuffer, skeletonBuffer)` | `Promise<Result<BG3DParseResult, string>>` |
| `readNativeAsset(path, options)` | `ResultAsync<NativeAsset, string>` |
| `readGltf(path)` | `ResultAsync<Document, string>` |
| `convertModelFiles(input, output, options)` | `ResultAsync<ModelConversionReport, string>` |
| `inspectModelFile(input, options)` | `ResultAsync<Record<string, unknown>, string>` |

```ts
import { parseSkeletonRsrcResult, skeletonResourceToBinary } from "@pangea/model-codec";
import { convertModelFiles } from "@pangea/model-codec/node";

const resource = await parseSkeletonRsrcResult(skeletonBytes);
const binary = resource.andThen(skeletonResourceToBinary);
binary.match(handleSkeletonBytes, handleError);

const conversion = await convertModelFiles("Blob.glb", "edited/Blob.bg3d", {
  target: "ottomatic",
  allowLossy: false,
});
conversion.match(handleConversionReport, handleError);
```

`bg3dParsedToGLTF` and `gltfToBG3D` convert already-loaded data directly and return plain values. Use the Node conversion API when you need the compatibility checks and loss policy described above. Library logging is silent unless a sink is installed with `setCodecLogger`.
