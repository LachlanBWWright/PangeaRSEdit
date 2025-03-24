import { lzssCompress, lzssDecompress } from "./lzss";

export type LzssMessage =
  | {
      id: number;
      type: "compress";
      decompressedDataView: DataView;
    }
  | {
      id: number;
      type: "decompress";
      compressedDataView: DataView;
      outputSize: number;
    };

export type LzssResponse =
  | {
      id: number;
      type: "compressRes";
      dataView: DataView;
    }
  | {
      id: number;
      type: "decompressRes";
      dataView: DataView;
    };

onmessage = async (event: MessageEvent<LzssMessage>) => {
  if (event.data.type === "compress") {
    const { decompressedDataView } = event.data;
    const compressedDataView = lzssCompress(decompressedDataView);
    postMessage({
      id: event.data.id,
      type: "compressRes",
      dataView: compressedDataView,
    } satisfies LzssResponse);
  }
  if (event.data.type === "decompress") {
    const { compressedDataView, outputSize } = event.data;
    const decompressedDataView = lzssDecompress(compressedDataView, outputSize);
    postMessage({
      id: event.data.id,
      type: "decompressRes",
      dataView: decompressedDataView,
    } satisfies LzssResponse);
  }
};
