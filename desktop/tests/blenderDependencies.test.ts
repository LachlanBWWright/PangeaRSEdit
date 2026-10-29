import path from "node:path";
import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { blendDependencyArguments, inspectBlendDependencies, packBlendSource, parseBlendDependencies } from "../src/blenderDependencies.ts";
import * as processes from "../src/processes.ts";
import { io } from "../src/files.ts";
import { useTemporaryDirectory } from "./fixtures.ts";
import { importBlendSource } from "../src/assetBlendSources.ts";
import { convertAsset } from "../src/assetConversion.ts";
import { readGltf } from "@pangea/model-codec/node";
import { exportBlend } from "../src/blenderConversion.ts";

const root = useTemporaryDirectory();

describe("Blender authoring dependencies", () => {
  it("passes paths as arguments with automatic scripts disabled", () => {
    const args = blendDependencyArguments("/sources/farm enemy.blend", "/project/portable.blend");
    expect(args.indexOf("--disable-autoexec")).toBeLessThan(args.indexOf("/sources/farm enemy.blend"));
    expect(args.slice(-3)).toEqual(["--", "/project/portable.blend", "{}"]);
    expect(args[args.indexOf("--python-expr") + 1]).toContain("pack_libraries");
    expect(args[args.indexOf("--python-expr") + 1]).toContain("remaining");
  });

  it("parses only the explicit report and normalizes duplicate absolute paths", () => {
    const texture = path.join(root(), "texture.png");
    const output = `Blender startup\nPANGEA_BLEND_DEPENDENCIES:${JSON.stringify([texture, texture])}\nBlender quit\n`;
    const result = parseBlendDependencies(output);
    expect(result.isOk() && result.value).toEqual([texture]);
    expect(parseBlendDependencies("startup only").isErr()).toBe(true);
    expect(parseBlendDependencies('PANGEA_BLEND_DEPENDENCIES:["../texture.png"]').isErr()).toBe(true);
    expect(parseBlendDependencies('PANGEA_BLEND_DEPENDENCIES:{"paths":[]}').isErr()).toBe(true);
  });

  it("reports launch failure and cancellation without producing a snapshot", async () => {
    const failure = await inspectBlendDependencies(path.join(root(), "source.blend"), path.join(root(), "missing-blender"), new AbortController().signal);
    expect(failure.isErr() && failure.error.code).toBe("launch");
    const controller = new AbortController();
    controller.abort();
    const cancelled = await packBlendSource("source.blend", "output.blend", "unused", controller.signal);
    expect(cancelled.isErr() && cancelled.error.code).toBe("cancelled");
  });

  it("terminates an active dependency inspection when cancelled", async () => {
    vi.spyOn(processes, "startProcess").mockImplementation(() => ok(spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: ["ignore", "pipe", "pipe"] })));
    const controller = new AbortController();
    const pending = inspectBlendDependencies("source.blend", "configured-blender", controller.signal);
    controller.abort();
    const result = await pending;
    expect(result.isErr() && result.error.code).toBe("cancelled");
    vi.restoreAllMocks();
  });

  it.skipIf(!process.env.PANGEA_BLENDER_TEST_EXECUTABLE)("imports a portable linked Blender source and converts it to Otto native output after originals are deleted", async () => {
    const executable = process.env.PANGEA_BLENDER_TEST_EXECUTABLE ?? "/snap/bin/blender";
    const source = path.join(root(), "source.blend");
    const expression = [
      "import bpy,os,sys",
      "root=sys.argv[sys.argv.index('--')+1]",
      "image=bpy.data.images.new('External texture',width=2,height=2)",
      "image.filepath_raw=os.path.join(root,'texture.png')",
      "image.file_format='PNG'",
      "image.save()",
      "material=bpy.data.materials.new('Textured material')",
      "material.use_nodes=True",
      "texture=material.node_tree.nodes.new('ShaderNodeTexImage')",
      "texture.image=image",
      "material.node_tree.links.new(texture.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])",
      "bpy.context.active_object.data.materials.clear()",
      "bpy.context.active_object.data.materials.append(material)",
      "library=os.path.join(root,'library.blend')",
      "bpy.ops.wm.save_as_mainfile(filepath=library)",
      "bpy.ops.wm.read_factory_settings(use_empty=True)",
      "with bpy.data.libraries.load(library,link=True) as (source,target): target.objects=['Cube']",
      "for obj in target.objects: bpy.context.scene.collection.objects.link(obj)",
      "bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'source.blend'))",
    ].join("\n");
    const created = await processes.runProcess(executable, ["--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python-expr", expression, "--", root()], root());
    expect(created.isOk(), created.isErr() ? created.error.message : "").toBe(true);
    if (created.isErr()) return;
    const dependencies = await inspectBlendDependencies(source, executable, new AbortController().signal);
    expect(dependencies.isOk(), dependencies.isErr() ? dependencies.error.message : "").toBe(true);
    expect(dependencies.isOk() && dependencies.value).toEqual([path.join(root(), "library.blend"), path.join(root(), "texture.png")]);
    const result = await importBlendSource(path.join(root(), "project"), { sourcePath: source, mode: "managed", assetId: randomUUID() }, executable, new AbortController().signal);
    expect(result.isOk(), result.isErr() ? result.error.message : "").toBe(true);
    if (result.isErr()) return;
    const packed = result.value.entryPath;
    expect(result.value.dependencies).toEqual([]);
    expect(result.value.mode).toBe("managed");
    await io(() => fs.rm(path.join(root(), "library.blend")), "remove original library");
    await io(() => fs.rm(path.join(root(), "texture.png")), "remove original texture");
    await io(() => fs.rm(source), "remove original Blender source");
    const portable = await inspectBlendDependencies(packed, executable, new AbortController().signal);
    expect(portable.isOk(), portable.isErr() ? portable.error.message : "").toBe(true);
    expect(portable.isOk() && portable.value).toEqual([]);
    const reopened = await processes.runProcess(executable, ["--background", "--factory-startup", "--disable-autoexec", packed,
      "--python-exit-code", "1", "--python-expr",
      "import bpy,sys; mesh=bpy.data.objects.get('Cube'); image=bpy.data.images.get('External texture'); sys.exit(0 if mesh and len(mesh.data.vertices)==8 and image and image.packed_file else 1)"], root());
    expect(reopened.isOk(), reopened.isErr() ? reopened.error.message : "").toBe(true);
    const exported = await exportBlend(packed, path.join(root(), "diagnostic.glb"), executable, new AbortController().signal);
    expect(exported.isOk(), exported.isErr() ? exported.error.message : "").toBe(true);
    const gltf = await readGltf(path.join(root(), "diagnostic.glb"));
    expect(gltf.isOk(), gltf.isErr() ? gltf.error : "").toBe(true);
    if (gltf.isOk()) {
      expect(gltf.value.getRoot().listMeshes().length, "Blender GLB geometry").toBeGreaterThan(0);
      expect(gltf.value.getRoot().listTextures().length, "Blender GLB textures").toBeGreaterThan(0);
    }
    const converted = await convertAsset({ sourcePath: packed, game: "OttoMatic", blenderExecutable: executable,
      stagingDirectory: path.join(root(), "converted"), allowLossy: true, signal: new AbortController().signal, onProgress: vi.fn() });
    expect(converted.isOk(), converted.isErr() ? converted.error.message : "").toBe(true);
    if (converted.isErr()) return;
    expect(path.extname(converted.value.modelPath)).toBe(".bg3d");
    const native = await io(() => fs.readFile(converted.value.modelPath), "read generated BG3D");
    expect(native.isOk() && native.value.byteLength).toBeGreaterThan(0);
    const preview = await readGltf(converted.value.previewPath);
    expect(preview.isOk(), preview.isErr() ? preview.error : "").toBe(true);
    if (preview.isOk()) {
      expect(preview.value.getRoot().listMeshes().length).toBeGreaterThan(0);
      expect(preview.value.getRoot().listTextures().length).toBeGreaterThan(0);
    }
  }, 180_000);
});
