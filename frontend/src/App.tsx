import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { SpriteViewer } from "./pages/SpriteViewer";
import { DownloadLevels } from "./pages/DownloadLevels";
import { TooltipProvider } from "@/components/ui/tooltip";

export function App() {
  return (
    <TooltipProvider>
<<<<<<< HEAD
      <HashRouter>
        <div className="dark flex flex-col h-screen bg-gray-900">
=======
      <Router basename="/PangeaRSEdit/">
        <div className="flex flex-col min-h-screen bg-gray-900">
>>>>>>> origin/main
          <Navigation />
          <div className="flex-1 min-h-0 overflow-auto">
            <Routes>
              <Route path="/" element={<LevelEditor />} />
              <Route path="/model-viewer" element={<ModelViewer />} />
              <Route path="/sprite-viewer" element={<SpriteViewer />} />
              <Route path="/download-levels" element={<DownloadLevels />} />
              <Route path="*" element={<LevelEditor />} />
            </Routes>
          </div>
        </div>
      </Router>
    </TooltipProvider>
  );
}
