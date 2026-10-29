import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ok, type Result } from "neverthrow";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import type { Texture } from "../types";
import { useFileUpload, type UseFileUploadOptions } from "./useFileUpload";
import { guardModelUpload } from "./guardModelUpload";
import { runWorkerMessage } from "./useFileUploadHelpers";
import { extractTexturesFromBG3D } from "../utils/textureUtils";

vi.mock(import("./useFileUploadHelpers"), async (original) => ({ ...await original(), runWorkerMessage: vi.fn() }));
vi.mock(import("../utils/textureUtils"), async (original) => ({ ...await original(), extractTexturesFromBG3D: vi.fn() }));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve: (value: T) => resolve(value) };
}

class ModelFile extends File {
  override async arrayBuffer() { return new ArrayBuffer(4); }
}

const response: BG3DGltfWorkerResponse = { type: "bg3d-to-glb", result: new ArrayBuffer(8), parsed: { materials: [], groups: [] } };
let root: Root | null = null;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function callbacks(): UseFileUploadOptions {
  return { onGltfUrlChange: vi.fn(), onGltfBufferChange: vi.fn(), onBg3dParsedChange: vi.fn(),
    onTexturesChange: vi.fn(), onLoadingChange: vi.fn(), onUploadStepChange: vi.fn() };
}

async function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const create = vi.fn(() => "blob:current-model"), revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  const options = callbacks();
  vi.mocked(extractTexturesFromBG3D).mockResolvedValue([]);
  let upload: ((file: File, skeleton?: File, current?: () => boolean) => Promise<Result<void, string>>) | undefined;
  let cancel: (() => void) | undefined;
  function Binding() { const loader = useFileUpload(options); upload = loader.uploadFile; cancel = loader.cancelUpload; return null; }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Binding />));
  return { options, create, revoke, cancel: () => cancel?.(), upload: (current?: () => boolean) => upload?.(new ModelFile([], "model.bg3d"), undefined, current) };
}

it("ignores a deferred worker result after its project ownership expires", async () => {
  const worker = deferred<Result<BG3DGltfWorkerResponse, string>>();
  vi.mocked(runWorkerMessage).mockReturnValue(worker.promise);
  const { options, create, upload } = await mount();
  let current = true;
  const pending = upload(() => current);
  await act(async () => { await Promise.resolve(); });
  current = false;
  await act(async () => { worker.resolve(ok(response)); await pending; });
  expect(options.onGltfBufferChange).not.toHaveBeenCalled();
  expect(options.onBg3dParsedChange).not.toHaveBeenCalled();
  expect(options.onTexturesChange).not.toHaveBeenCalled();
  expect(options.onUploadStepChange).not.toHaveBeenCalled();
  expect(options.onLoadingChange).toHaveBeenLastCalledWith(false);
  expect(create).not.toHaveBeenCalled();
});

it("discards deferred texture completion without restoring cleared model state", async () => {
  vi.mocked(runWorkerMessage).mockResolvedValue(ok(response));
  const textures = deferred<Texture[]>();
  const { options, create, upload } = await mount();
  vi.mocked(extractTexturesFromBG3D).mockReturnValue(textures.promise);
  let current = true;
  const pending = upload(() => current);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(options.onBg3dParsedChange).toHaveBeenCalledOnce();
  current = false;
  vi.mocked(options.onBg3dParsedChange).mockClear();
  await act(async () => { textures.resolve([]); await pending; });
  expect(options.onBg3dParsedChange).not.toHaveBeenCalled();
  expect(options.onTexturesChange).not.toHaveBeenCalled();
  expect(options.onGltfBufferChange).not.toHaveBeenCalled();
  expect(options.onGltfUrlChange).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it("keeps a newer upload when an older worker finishes later", async () => {
  const oldWorker = deferred<Result<BG3DGltfWorkerResponse, string>>();
  vi.mocked(runWorkerMessage).mockReturnValueOnce(oldWorker.promise).mockResolvedValue(ok(response));
  const { options, create, upload } = await mount();
  const old = upload();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  await act(async () => { await upload(); });
  expect(create).toHaveBeenCalledOnce();
  vi.mocked(options.onGltfUrlChange).mockClear();
  vi.mocked(options.onGltfBufferChange).mockClear();
  await act(async () => { oldWorker.resolve(ok(response)); await old; });
  expect(options.onGltfUrlChange).not.toHaveBeenCalled();
  expect(options.onGltfBufferChange).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledOnce();
});

it("cancels pending model state and object URL creation on unmount", async () => {
  const worker = deferred<Result<BG3DGltfWorkerResponse, string>>();
  vi.mocked(runWorkerMessage).mockReturnValue(worker.promise);
  const { options, create, upload } = await mount();
  const pending = upload();
  await act(async () => root?.unmount()); root = null;
  await act(async () => { worker.resolve(ok(response)); await pending; });
  expect(options.onGltfBufferChange).not.toHaveBeenCalled();
  expect(options.onGltfUrlChange).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

it("revokes an object URL rejected by an expired commit guard", async () => {
  const { options, revoke } = await mount();
  guardModelUpload(options, () => false).onGltfUrlChange("blob:superseded");
  expect(revoke).toHaveBeenCalledWith("blob:superseded");
  expect(options.onGltfUrlChange).not.toHaveBeenCalled();
});

it("keeps the model cleared when a cancelled upload completes its textures", async () => {
  vi.mocked(runWorkerMessage).mockResolvedValue(ok(response));
  const textures = deferred<Texture[]>();
  const { options, create, upload, cancel } = await mount();
  vi.mocked(extractTexturesFromBG3D).mockReturnValue(textures.promise);
  const pending = upload();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  cancel();
  expect(options.onLoadingChange).toHaveBeenLastCalledWith(false);
  vi.mocked(options.onGltfBufferChange).mockClear();
  await act(async () => { textures.resolve([]); await pending; });
  expect(options.onTexturesChange).not.toHaveBeenCalled();
  expect(options.onGltfBufferChange).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});
