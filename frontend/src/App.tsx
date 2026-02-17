import { HashRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { SpriteViewer } from "./pages/SpriteViewer";
import { DownloadLevels } from "./pages/DownloadLevels";
import { TestModelViewer } from "./pages/TestModelViewer";
import { ItemModelViewer } from "./pages/ItemModelViewer";
import { ItemAuditPage } from "./pages/ItemAuditPage";
import { TooltipProvider } from "@/components/ui/tooltip";

export function App() {
  return (
    <TooltipProvider>
      <HashRouter>
        <div className="dark flex flex-col h-screen bg-gray-900">
          <Navigation />
          <div className="flex-1 min-h-0 overflow-auto">
            <Routes>
              <Route path="/" element={<LevelEditor />} />
              <Route path="/model-viewer" element={<ModelViewer />} />
              <Route path="/sprite-viewer" element={<SpriteViewer />} />
              <Route path="/download-levels" element={<DownloadLevels />} />
              <Route path="/test-models" element={<TestModelViewer />} />
              <Route path="/item-models" element={<ItemModelViewer />} />
              <Route path="/item-audit" element={<ItemAuditPage />} />
              <Route path="*" element={<LevelEditor />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </TooltipProvider>
  );
}
