import { createHashRouter, RouterProvider, Navigate, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { Navigation } from "./components/Navigation";
import { useFeatureFlags } from "@/config/useFeatureFlags";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AssetLoadingStatus } from "@/assets/AssetLoadingStatus";
import { DesktopNavigationGuard } from "@/platform/desktop/DesktopNavigationGuard";
import { DesktopTitleBar } from "@/platform/desktop/DesktopTitleBar";
import { desktopBridge } from "@/platform/desktop/client";

const LevelEditor = lazy(() => import("./pages/LevelEditor").then((module) => ({ default: module.LevelEditor })));
const ModelViewer = lazy(() => import("./pages/ModelViewer").then((module) => ({ default: module.ModelViewer })));
const SpriteViewer = lazy(() => import("./pages/SpriteViewer").then((module) => ({ default: module.SpriteViewer })));
const DownloadLevels = lazy(() => import("./pages/DownloadLevels").then((module) => ({ default: module.DownloadLevels })));
const TestModelViewer = lazy(() => import("./pages/TestModelViewer").then((module) => ({ default: module.TestModelViewer })));
const ItemModelViewer = lazy(() => import("./pages/ItemModelViewer").then((module) => ({ default: module.ItemModelViewer })));
const ItemAuditPage = lazy(() => import("./pages/ItemAuditPage").then((module) => ({ default: module.ItemAuditPage })));
const MultiplayerPage = lazy(() => import("./pages/Multiplayer").then((module) => ({ default: module.MultiplayerPage })));
const CustomObjectsPage = lazy(() => import("./pages/CustomObjectsPage").then((module) => ({ default: module.CustomObjectsPage })));
const GamesPage = lazy(() => import("./platform/desktop/GamesPage").then((module) => ({ default: module.GamesPage })));
const DesktopProjectController = lazy(() => import("./platform/desktop/DesktopProjectController").then((module) => ({ default: module.DesktopProjectController })));

export function App() {
  const [router] = useState(() => createHashRouter([{ path: "*", element: <AppContent /> }]));
  return <RouterProvider router={router} />;
}

function AppContent() {
  return (
    <TooltipProvider>
      <DesktopNavigationGuard />
      <div className="dark flex flex-col h-screen bg-gray-900">
        <DesktopTitleBar />
        <Navigation />
        {desktopBridge() ? <Suspense fallback={null}><DesktopProjectController /></Suspense> : null}
        <AssetLoadingStatus />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">
          <Suspense fallback={<p role="status" className="p-6 text-slate-300">Loading workspace…</p>}>
            <AppRoutes />
          </Suspense>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

function AppRoutes() {
  const featureFlags = useFeatureFlags();

  return (
    <Routes>
      <Route path="/games" element={<GamesPage />} />
      <Route path="/" element={<LevelEditor />} />
      <Route path="/model-viewer" element={<ModelViewer />} />
      <Route path="/sprite-viewer" element={<SpriteViewer />} />
      <Route path="/download-levels" element={<DownloadLevels />} />
      <Route path="/custom-objects" element={featureFlags.scripting ? <CustomObjectsPage /> : <Navigate to="/" replace />} />
      <Route path="/test-models" element={<TestModelViewer />} />
      <Route path="/item-model-mapping-preview" element={featureFlags.itemModelMappingPreview ? <ItemModelViewer /> : <Navigate to="/" replace />} />
      <Route path="/item-models" element={<Navigate to={featureFlags.itemModelMappingPreview ? "/item-model-mapping-preview" : "/"} replace />} />
      <Route path="/item-audit" element={<ItemAuditPage />} />
      <Route path="/multiplayer" element={featureFlags.multiplayer ? <MultiplayerPage /> : <Navigate to="/" replace />} />
      <Route path="*" element={<LevelEditor />} />
    </Routes>
  );
}
