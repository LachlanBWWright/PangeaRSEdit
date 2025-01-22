import { useEffect, useState } from "react";
import "./App.css";
import { loadPyodide, PyodideInterface } from "pyodide";
import rsrcDumpUrl from "./assets/rsrcdump-0.1.0-py3-none-any.whl?url";
import { PyodideContext } from "./python/pyodide";
import { MapPrompt } from "./editor/MapPrompt";

function App() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  useEffect(() => {
    loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    }).then(async (pyodide) => {
      await pyodide.loadPackage(rsrcDumpUrl);
      await pyodide.runPythonAsync("import rsrcdump");
      setPyodide(pyodide);
    });
  }, []);

  if (!pyodide)
    return (
      <div className="text-white w-screen h-screen flex">
        <h1 className="flex-1 m-auto text-4xl">Loading Map Editor...</h1>
      </div>
    );

  return (
    <PyodideContext.Provider value={pyodide}>
      <MapPrompt pyodide={pyodide} />
    </PyodideContext.Provider>
  );
}

export default App;
