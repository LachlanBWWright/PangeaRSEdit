import { createHashRouter, RouterProvider, Navigate, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { LevelEditor } from "./pages/LevelEditor";
import { ModelViewer } from "./pages/ModelViewer";
import { SpriteViewer } from "./pages/SpriteViewer";
import { DownloadLevels } from "./pages/DownloadLevels";
import { TestModelViewer } from "./pages/TestModelViewer";
import { ItemModelViewer } from "./pages/ItemModelViewer";
import { ItemAuditPage } from "./pages/ItemAuditPage";
import { MultiplayerPage } from "./pages/Multiplayer";
import { CustomObjectsPage } from "./pages/CustomObjectsPage";
import { useFeatureFlags } from "@/config/useFeatureFlags";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DesktopProjectController } from "@/platform/desktop/DesktopProjectController";
import { GamesPage } from "@/platform/desktop/GamesPage";
import { DesktopNavigationGuard } from "@/platform/desktop/DesktopNavigationGuard";
import { DesktopTitleBar } from "@/platform/desktop/DesktopTitleBar";

export function App() {
  const [router] = useState(() => createHashRouter([{ path: "*", element: <AppContent /> }]));
  return <RouterProvider router={router} />;
}

function AppContent() {
  const featureFlags = useFeatureFlags();

  return (
    <TooltipProvider>
      <DesktopNavigationGuard />
        <div className="dark flex flex-col h-screen bg-gray-900">
          <DesktopTitleBar />
          <Navigation />
          <DesktopProjectController />
          <div className="flex-1 min-h-0 overflow-auto flex flex-col">
            <Routes>
              <Route path="/games" element={<GamesPage />} />
              <Route path="/" element={<LevelEditor />} />
              <Route path="/model-viewer" element={<ModelViewer />} />
              <Route path="/sprite-viewer" element={<SpriteViewer />} />
              <Route path="/download-levels" element={<DownloadLevels />} />
              <Route
                path="/custom-objects"
                element={
                  featureFlags.scripting ? (
                    <CustomObjectsPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/test-models" element={<TestModelViewer />} />
              <Route
                path="/item-model-mapping-preview"
                element={
                  featureFlags.itemModelMappingPreview ? (
                    <ItemModelViewer />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/item-models"
                element={
                  featureFlags.itemModelMappingPreview ? (
                    <Navigate to="/item-model-mapping-preview" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/item-audit" element={<ItemAuditPage />} />
              <Route
                path="/multiplayer"
                element={
                  featureFlags.multiplayer ? (
                    <MultiplayerPage />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="*" element={<LevelEditor />} />
            </Routes>
          </div>
        </div>
      <Toaster />
    </TooltipProvider>
  );
}
