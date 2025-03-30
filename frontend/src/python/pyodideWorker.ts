import { loadPyodide, PyodideInterface } from "pyodide";
import rsrcDumpUrl from "../assets/rsrcdump-0.1.0-py3-none-any.whl?url";

let pyodide: PyodideInterface | null = null;

export type PyodideMessage =
  | {
      type: "init";
    }
  | {
      type: "load_bytes_from_json";
      json_blob: any;
      converters: string[];
      only_types: string[];
      skip_types: string[];
      adf: "True" | "False";
    }
  | {
      type: "save_to_json";
      bytes: ArrayBuffer;
      struct_specs: string[];
      include_types: string[];
      exclude_types: string[];
    };

export type PyodideResponse =
  | {
      type: "load_bytes_from_json";
      result: ArrayBuffer;
    }
  | {
      type: "save_to_json";
      result: any;
    }
  | {
      type: "initRes";
    };

onmessage = async (event: MessageEvent<PyodideMessage>) => {
  if (event.data.type === "init") {
    const pyodideRes = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
    await pyodideRes.loadPackage(rsrcDumpUrl);
    await pyodideRes.runPythonAsync("import rsrcdump");
    pyodide = pyodideRes;

    postMessage({
      type: "initRes",
    } satisfies PyodideResponse);
  }

  if (!pyodide) {
    return;
  }

  if (event.data.type === "load_bytes_from_json") {
    const { json_blob, converters, only_types, skip_types, adf } = event.data;

    //@ts-ignore
    const byteBuffer = new ArrayBuffer();
    //@ts-ignore
    self.byteBuffer = byteBuffer; //TODO: Find better solution @ts-ignore
    const jsonBuffer = json_blob;
    //@ts-ignore
    self.jsonBuffer = jsonBuffer; //TODO: Find better solution @ts-ignore
    await pyodide.runPythonAsync(`
        from js import jsonBuffer
        json_buffer = jsonBuffer.to_py()
    `);

    const res = await pyodide.runPythonAsync(`rsrcdump.load_bytes_from_json(
        json_buffer,
        ${JSON.stringify(converters)},
        ${JSON.stringify(only_types)},
        ${JSON.stringify(skip_types)},
        ${adf}
        )`);

    const pyBuffer = res.getBuffer("dataview").data;
    const resBuffer = pyBuffer.buffer.slice(
      pyBuffer.byteOffset,
      pyBuffer.byteOffset + pyBuffer.byteLength,
    );

    postMessage({
      type: "load_bytes_from_json",
      result: resBuffer,
    } satisfies PyodideResponse);
  }

  if (event.data.type === "save_to_json") {
    const { bytes, struct_specs, include_types, exclude_types } = event.data;
    //@ts-ignore
    self.resBuffer = bytes; //TODO: Find better solution @ts-ignore
    await pyodide.runPythonAsync(`
            from js import resBuffer
            buffer = resBuffer.to_py()
            buffer = buffer.tobytes()
        `);
    const result = await pyodide.runPythonAsync(`rsrcdump.save_to_json(
        buffer,
        ${JSON.stringify(struct_specs)},
        ${JSON.stringify(include_types)},
        ${JSON.stringify(exclude_types)}
        )`);
    postMessage({
      type: "save_to_json",
      result: JSON.parse(result),
    } satisfies PyodideResponse);
  }
};
