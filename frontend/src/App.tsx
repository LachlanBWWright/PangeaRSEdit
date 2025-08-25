import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { DownloadLevels } from "./pages/DownloadLevels";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <Router basename="/PangeaRSEdit/">
        <div className="flex flex-col min-h-screen bg-gray-900">
          <Navigation />
          <Routes>
            <Route path="/" element={<LevelEditor />} />
            <Route path="/model-viewer" element={<ModelViewer />} />
            <Route path="/download-levels" element={<DownloadLevels />} />
            <Route path="*" element={<LevelEditor />} />
          </Routes>
        </div>
      </Router>
    </TooltipProvider>
  );
}

export default App;
