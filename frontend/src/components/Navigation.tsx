import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, Box, Download } from "lucide-react";

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2 h-14 flex items-center gap-4">
      <h1 className="text-white text-xl font-bold">PangeaRS Edit</h1>
      <div className="flex gap-2">
        <Button
          asChild
          variant={location.pathname === "/" ? "default" : "ghost"}
          className="flex items-center gap-2"
        >
          <Link to="/" className="text-white">
            <Map className="w-4 h-4" />
            Level Editor
          </Link>
        </Button>
        <Button
          asChild
          variant={location.pathname === "/model-viewer" ? "default" : "ghost"}
          className="flex items-center gap-2"
        >
          <Link to="/model-viewer" className="text-white">
            <Box className="w-4 h-4" />
            Model Viewer
          </Link>
        </Button>
        <Button
          asChild
          variant={
            location.pathname === "/download-levels" ? "default" : "ghost"
          }
          className="flex items-center gap-2"
        >
          <Link to="/download-levels" className="text-white">
            <Download className="w-4 h-4" />
            Download Levels
          </Link>
        </Button>
      </div>
    </nav>
  );
}
