import { useState } from "react";
import { Download, ChevronDown, ChevronUp, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGamesByCategory, type Level } from "@/data/levels";
import { toast } from "sonner";
import { zip } from "fflate";

/** Fetch a URL as a Uint8Array. */
async function fetchBytes(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

/** Build a timestamp string suitable for filenames: YYYYMMDD_HHMMSS */
function fileTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

interface LevelCardProps {
  level: Level;
}

function LevelCard({ level }: LevelCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const downloadLevel = async () => {
    const files: Record<string, Uint8Array<ArrayBuffer>> = {};

    try {
      if (level.terFile) {
        const name = level.terFile.split("/").pop() ?? `${level.id}.ter`;
        files[name] = await fetchBytes(level.terFile);
      }
      if (level.rsrcFile) {
        const name = level.rsrcFile.split("/").pop() ?? `${level.id}.ter.rsrc`;
        files[name] = await fetchBytes(level.rsrcFile);
      }
    } catch {
      toast.error("Failed to download level files");
      return;
    }

    if (Object.keys(files).length === 0) {
      toast.error("No downloadable files found for this level");
      return;
    }

    const levelNumber = level.category?.replace(/\D/g, "") ?? level.id;
    const zipName = `${level.gameDisplayName} Level ${levelNumber} (${fileTimestamp()}).zip`
      .replace(/[/\\:*?"<>|]/g, "_");

    zip(files, (err, data) => {
      if (err) {
        toast.error("Failed to create zip archive");
        return;
      }
      const blob = new Blob([data.slice(0)], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${zipName}`);
    });
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-1">
              {level.name}
            </CardTitle>
            <CardDescription className="text-gray-300 mb-2">
              {level.gameDisplayName}
              {level.category && (
                <span className="ml-2 text-blue-400">• {level.category}</span>
              )}
              {level.difficulty && (
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    level.difficulty === "Easy"
                      ? "bg-green-900 text-green-300"
                      : level.difficulty === "Medium"
                      ? "bg-yellow-900 text-yellow-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {level.difficulty}
                </span>
              )}
            </CardDescription>
            <p className="text-gray-400 text-sm">{level.summary}</p>
          </div>
          <Button
            onClick={() => void downloadLevel()}
            className="ml-4 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between text-gray-300 hover:text-white hover:bg-gray-700 p-3 mb-3"
        >
          <span>Details</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
        {isExpanded && (
          <div className="text-gray-300 text-sm leading-relaxed bg-gray-900 rounded-lg p-4">
            {level.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GameSectionProps {
  gameName: string;
  levels: Level[];
}

function GameSection({ gameName, levels }: GameSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Gamepad2 className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">{gameName}</h2>
        <div className="h-px bg-gray-700 flex-1"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} />
        ))}
      </div>
    </div>
  );
}

export function DownloadLevels() {
  const gamesByCategory = getGamesByCategory();

  return (
    <div className="h-full overflow-auto bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 mb-8 text-center">
          <h1 className="text-4xl font-bold text-white pb-2">
            Download Custom Levels
          </h1>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Download levels from various Pangea Software games, and add them to
            the data/terrain folder in the game files to replace level files.
          </p>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            If you would like to submit a level for possible inclusion here,
            feel free to contact me through GitHub by posting it to the{" "}
            <a
              href="https://github.com/LachlanBWWright/PangeaRSEdit/discussions"
              className="text-blue-400 underline hover:text-blue-300"
            >
              discussions page
            </a>
            , or messaging me on Reddit at u/LachlanBWWright.
          </p>
          <p></p>
        </div>

        {gamesByCategory.map((game) => (
          <GameSection
            key={game.id}
            gameName={game.name}
            levels={game.levels}
          />
        ))}
      </div>
    </div>
  );
}
