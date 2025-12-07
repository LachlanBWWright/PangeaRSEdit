import { Routes, Route, HashRouter } from "react-router-dom";
import "./App.css";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { DownloadLevels } from "./pages/DownloadLevels";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";

export function App() {
  return (
    <TooltipProvider>
      <HashRouter>
        <div className="flex flex-col h-screen bg-gray-900">
          <Navigation />
          <div className="flex-1 min-h-0 overflow-auto">
            <Routes>
              <Route path="/" element={<LevelEditor />} />
              <Route path="/model-viewer" element={<ModelViewer />} />
              <Route path="/download-levels" element={<DownloadLevels />} />
              <Route path="*" element={<LevelEditor />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  );
}
