import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { DragEvent } from "react";
import type {
  BG3DGltfWorkerMessage,
  BG3DGltfWorkerResponse,
} from "@/modelParsers/bg3dGltfWorker";
import { ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";

export interface ConversionRunArgs {
  readonly file: File;
  readonly conversionType: "bg3d-to-glb" | "glb-to-bg3d";
  readonly fileExtension: string;
}

export function toDownloadName(
  fileName: string,
  fileExtension: string,
  outputExtension: string,
): string {
  return fileName.replace(
    new RegExp(`\\.${fileExtension}$`),
    `.${outputExtension}`,
  );
}

export async function runConversionWorker({
  file,
  conversionType,
}: ConversionRunArgs): Promise<BG3DGltfWorkerResponse | null> {
  const bufferResult = await ResultAsync.fromPromise(
    file.arrayBuffer(),
    mapErr,
  );
  if (bufferResult.isErr()) {
    alert(`Conversion failed: ${bufferResult.error}`);
    return null;
  }
  const buffer = new Uint8Array(bufferResult.value);
  const worker = new BG3DGltfWorker();

  const workerResult = await ResultAsync.fromPromise(
    new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
      worker.onmessage = (event) => {
        resolve(event.data);
        worker.terminate();
      };

      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };

      const message: BG3DGltfWorkerMessage = {
        type: conversionType,
        buffer: buffer.buffer,
      };

      worker.postMessage(message, [buffer]);
    }),
    mapErr,
  );

  if (workerResult.isErr()) {
    alert(`Conversion failed: ${workerResult.error}`);
    return null;
  }

  return workerResult.value;
}

export function triggerConversionDownload(
  downloadName: string,
  mimeType: string,
  data: ArrayBuffer | Uint8Array,
): void {
  let blobData: BlobPart;
  if (data instanceof ArrayBuffer) {
    blobData = data;
  } else if (data.buffer instanceof ArrayBuffer) {
    blobData = data.buffer;
  } else {
    blobData = new Uint8Array(data);
  }
  const convertedBlob = new Blob([blobData], { type: mimeType });
  const url = URL.createObjectURL(convertedBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getDroppedFile(
  e: DragEvent,
  extension: string,
): File | undefined {
  const files = Array.from(e.dataTransfer.files);
  return files.find((file) =>
    file.name.toLowerCase().endsWith(`.${extension}`),
  );
}
