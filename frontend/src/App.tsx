import { useEffect, useState } from "react";
import "./App.css";
import { loadPyodide, PyodideInterface } from "pyodide";
import rsrcDumpUrl from "./assets/rsrcdump-0.1.0-py3-none-any.whl?url";
import { MapPrompt } from "./editor/MapPrompt";
import { Toaster } from "./components/ui/toaster";
import PyodideWorker from "./python/pyodideWorker?worker";
import { PyodideMessage } from "./python/pyodideWorker";

function App() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [pyodideWorker, setPyodideWorker] = useState<null | Worker>(null);
  const [pyodideWorkerReady, setPyodideWorkerReady] = useState(false);
  useEffect(() => {
    const newPyodideWorker = new PyodideWorker();
    newPyodideWorker.postMessage({
      type: "init",
    } satisfies PyodideMessage);
    newPyodideWorker.onmessage = (event) => {
      if (event.data.type === "initRes") {
        setPyodideWorkerReady(true);
      }
    };
    setPyodideWorker(newPyodideWorker);
  }, []);

  useEffect(() => {
    loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    }).then(async (pyodide) => {
      await pyodide.loadPackage(rsrcDumpUrl);
      await pyodide.runPythonAsync("import rsrcdump");
      setPyodide(pyodide);
    });
  }, []);

  if (!pyodideWorkerReady || !pyodideWorker)
    return (
      <div className="text-white w-screen h-screen flex">
        <h1 className="flex-1 m-auto text-4xl">Loading Map Editor...</h1>
      </div>
    );

  return (
    <>
      <MapPrompt pyodideWorker={pyodideWorker} />
      <Toaster />
    </>
  );
}

export default App;
