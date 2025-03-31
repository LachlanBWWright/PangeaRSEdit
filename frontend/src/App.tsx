import { useEffect, useState } from "react";
import "./App.css";
import { MapPrompt } from "./editor/MapPrompt";
import { Toaster } from "./components/ui/toaster";
import PyodideWorker from "./python/pyodideWorker?worker";
import { PyodideMessage } from "./python/pyodideWorker";
import { Button } from "./components/Button";

function App() {
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

  if (!pyodideWorkerReady || !pyodideWorker)
    return (
      <div className="flex text-white m-auto flex-1 gap-8 flex-col items-center justify-center">
        <div className="flex flex-col gap-2 lg:w-1/2">
          <p className="text-6xl pb-2">Pangea Level Editor</p>
          <Button
            onClick={() =>
              window.open("https://github.com/LachlanBWWright/PangeaRSEdit")
            }
          >
            View on GitHub
          </Button>
          <p>
            This is a work in progress level editor for Otto Matic (And
            hopefully additional Pangea Software games).
          </p>
          <p>
            Introducing items that were not originally found in the level will
            be likely to cause Otto Matic to crash. Downloaded levels can be
            used by replacing the existing by level data, which can be found in
            the Terrain folder within Otto's Data folder. Otto Matic has strict
            limits for enemies, which means that placed enemy items may not
            appear. This can be bypassed by adding enemies as spline items.
          </p>
          <p>
            {" "}
            This project uses{" "}
            <a
              className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
              href="https://github.com/jorio/rsrcdump"
            >
              RSRCDump
            </a>{" "}
            by Jorio, the creator of the ports of Pangea games to modern day
            operating systems. Any feedback is appreciated!
          </p>
          <h1 className="flex-1 m-auto text-4xl">Loading Map Editor...</h1>
        </div>
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
