import { useEffect, useState } from "react";
import "./App.css";
import { loadPyodide, PyodideInterface } from "pyodide";
import rsrcDumpUrl from "./assets/rsrcdump-0.1.0-py3-none-any.whl?url";
import { PyodideContext } from "./python/pyodide";
import { save_to_json } from "./python/rsrcdump";

function App() {
  const [pyodide, setPyodide] = useState<PyodideInterface | undefined>(
    undefined,
  );
  useEffect(() => {
    loadPyodide().then(async (pyodide) => {
      await pyodide.loadPackage(rsrcDumpUrl);
      await pyodide.runPythonAsync("import rsrcdump");
      setPyodide(pyodide);

      await save_to_json(pyodide, [], [], [], []);
    });
  }, []);

  if (!pyodide)
    return (
      <div className="text-white min-h-screen min-w-screen">
        <h1>Loading Map Editor...</h1>
      </div>
    );

  return (
    <PyodideContext.Provider value={pyodide}>
      <div className="text-white min-h-screen min-w-screen">
        <h1>Map Editor</h1>
      </div>
    </PyodideContext.Provider>
  );
}

export default App;
