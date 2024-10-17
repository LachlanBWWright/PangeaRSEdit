import { PyodideInterface } from "pyodide";
import { ottoMaticSpecs } from "./structSpecs/ottoMatic.ts";
import ottoLevel from "../assets/FireIce.ter.rsrc?url";

export async function save_to_json(
  pyodide: PyodideInterface,
  bytes: ArrayBuffer,
  struct_specs: string[],
  include_types: string[],
  exclude_types: string[],
) {
  //const reader = new FileReader();
  const res = await fetch(ottoLevel);
  if (!res.body) {
    throw new Error("Failed to load level");
  }
  const resBuffer = await res.arrayBuffer();
  self.resBuffer = resBuffer; //TODO: Find better solution
  await pyodide.runPythonAsync(`
        from js import resBuffer
        buffer = resBuffer.to_py()
        buffer = buffer.tobytes()
        print("BUFFER")
        print(type(buffer))
        print(len(buffer))
    `);

  const result = await pyodide.runPythonAsync(`rsrcdump.save_to_json(
    buffer,
    ${JSON.stringify(ottoMaticSpecs)},
    [],
    [],
    )`);
  console.log(result);
}

export async function load_from_json(
  pyodide: PyodideInterface,
  json_blob: any,
  converters: string[],
  only_types: string[],
  skip_types: string[],
) {
  console.log(json_blob);
  console.log(converters);
  console.log(only_types);
  console.log(skip_types);
  await pyodide.runPythonAsync("");
}
