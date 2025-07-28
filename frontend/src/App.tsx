import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <Router basename="/PangeaRSEdit">
        <div className="min-h-screen bg-gray-900">
          <Navigation />
          <Routes>
            <Route path="/" element={<LevelEditor />} />
            <Route path="/model-viewer" element={<ModelViewer />} />
          </Routes>
        </div>
      </Router>
    </TooltipProvider>
  );
}

export default App;
