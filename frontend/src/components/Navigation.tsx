import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Map, Box, Download } from "lucide-react";

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-4 py-2 h-14 flex items-center gap-4">
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
        {/* <Button
          asChild
          variant={location.pathname === "/sprite-viewer" ? "default" : "ghost"}
          className="flex items-center gap-2"
        >
          <Link to="/sprite-viewer" className="text-white">
            <Image className="w-4 h-4" />
            Sprite Viewer
          </Link>
        </Button>
        */}
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
        {/* <Button
          asChild
          variant={
            location.pathname === "/item-models" ? "default" : "ghost"
          }
          className="flex items-center gap-2"
        >
          <Link to="/item-models" className="text-white">
            <Boxes className="w-4 h-4" />
            Item Models
          </Link>
        </Button>
        <Button
          asChild
          variant={
            location.pathname === "/test-models" ? "default" : "ghost"
          }
          className="flex items-center gap-2"
        >
          <Link to="/test-models" className="text-white">
            <FlaskConical className="w-4 h-4" />
            Test Models
            </Link>
          </Button>
        <Button
          asChild
          variant={
            location.pathname === "/item-audit" ? "default" : "ghost"
          }
          className="flex items-center gap-2"
        >
          <Link to="/item-audit" className="text-white">
            <ClipboardList className="w-4 h-4" />
            Item Audit
          </Link>
        </Button> */}
      </div>
    </nav>
  );
}
