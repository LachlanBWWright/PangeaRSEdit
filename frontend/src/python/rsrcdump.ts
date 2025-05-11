import { PyodideInterface } from "pyodide";

export async function save_to_json<T>(
  pyodide: PyodideInterface,
  bytes: ArrayBuffer,
  struct_specs: string[],
  include_types: string[],
  exclude_types: string[],
): Promise<T> {
  //const reader = new FileReader();
  //@ts-expect-error Dodgy data transfer
  self.resBuffer = bytes; //TODO: Find better solution @ts-expect-error
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
  return JSON.parse(result);
}

export async function load_bytes_from_json<T>(
  pyodide: PyodideInterface,
  json_blob: T,
  converters: string[] = [],
  only_types: string[] = [],
  skip_types: string[] = [],
  adf: "True" | "False" = "True",
): Promise<ArrayBuffer> {
  console.log(json_blob);
  console.log("Loading bytes from json");

  const byteBuffer = new ArrayBuffer();
  //@ts-expect-error Dodgy data transfer
  self.byteBuffer = byteBuffer; //TODO: Find better solution @ts-expect-error
  const jsonBuffer = json_blob;
  //@ts-expect-error Dodgy data transfer
  self.jsonBuffer = jsonBuffer; //TODO: Find better solution @ts-expect-error
  await pyodide.runPythonAsync(`
        from js import jsonBuffer
        json_buffer = jsonBuffer.to_py()
    `);

  const res = await pyodide.runPythonAsync(`
    rsrcdump.load_bytes_from_json(
      json_buffer,
      ${JSON.stringify(converters)},
      ${JSON.stringify(only_types)},
      ${JSON.stringify(skip_types)},
      ${adf}
    )
    `);

  const pyBuffer = res.getBuffer("dataview").data;
  const resBuffer = pyBuffer.buffer.slice(
    pyBuffer.byteOffset,
    pyBuffer.byteOffset + pyBuffer.byteLength,
  );
  return resBuffer;
}
