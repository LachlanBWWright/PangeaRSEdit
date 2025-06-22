import { useEffect, useState } from "react";
import "./App.css";
import { MapPrompt } from "./editor/MapPrompt";
import { Toaster } from "./components/ui/toaster";
import PyodideWorker from "./python/pyodideWorker?worker";
import { PyodideMessage } from "./python/pyodideWorker";
import { IntroText } from "./editor/IntroText";
import { TooltipProvider } from "@/components/ui/tooltip";

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
          <IntroText />
          <h1 className="flex-1 m-auto text-4xl">Loading Map Editor...</h1>
        </div>
      </div>
    );

  return (
    <TooltipProvider>
      <>
        <MapPrompt pyodideWorker={pyodideWorker} />
        <Toaster />
      </>
    </TooltipProvider>
  );
}

export default App;
