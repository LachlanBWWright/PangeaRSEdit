import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Group } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Game } from "@/data/globals/globals";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { fromPromise } from "@/types/result";
import {
  buildItemAuditEntries,
  createDecisionForEntry,
  createItemAuditReport,
  getItemAuditConfig,
  getItemAuditConfigs,
  type ItemAuditDecision,
  type ParamStatus,
} from "./itemAuditUtils";

interface StatusSelectProps {
  value: ParamStatus;
  onChange: (value: ParamStatus) => void;
}

function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === "correct" ? "default" : "outline"}
        onClick={() => onChange("correct")}
      >
        Correct
      </Button>
      <Button
        type="button"
        variant={value === "incorrect" ? "destructive" : "outline"}
        onClick={() => onChange("incorrect")}
      >
        Incorrect
      </Button>
    </div>
  );
}

const PARAM_KEYS: ("p0" | "p1" | "p2" | "p3")[] = ["p0", "p1", "p2", "p3"];

function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize: number,
): Group | null {
  const groupsContainer =
    gltf.scene.children && gltf.scene.children.length > 0
      ? gltf.scene.children[0]
      : null;
  if (!groupsContainer) {
    return null;
  }
  if (modelIndex < 0 || modelIndex >= groupsContainer.children.length) {
    return null;
  }
  const endIndex = Math.min(modelIndex + groupSize, groupsContainer.children.length);
  const extracted = new Group();
  for (let index = modelIndex; index < endIndex; index++) {
    const child = groupsContainer.children[index];
    if (child) {
      extracted.add(child.clone(true));
    }
  }
  return extracted.children.length > 0 ? extracted : null;
}

function isEntryFullyRated(entry: ItemAuditDecision): boolean {
  return (
    entry.modelStatus !== "unknown" &&
    entry.paramStatus.p0 !== "unknown" &&
    entry.paramStatus.p1 !== "unknown" &&
    entry.paramStatus.p2 !== "unknown" &&
    entry.paramStatus.p3 !== "unknown"
  );
}

export function ItemAuditPage() {
  const gameConfigs = getItemAuditConfigs();
  const [selectedGame, setSelectedGame] = useState<Game>(Game.OTTO_MATIC);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, ItemAuditDecision>>({});
  const [previewScene, setPreviewScene] = useState<Group | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const autoDownloadedRef = useRef(false);

  const entries = useMemo(
    () => buildItemAuditEntries(selectedGame, decisions),
    [selectedGame, decisions],
  );
  const currentEntry = entries[currentIndex];
  const currentConfig = getItemAuditConfig(selectedGame);
  const currentDecision = currentEntry
    ? decisions[currentEntry.itemType] ?? createDecisionForEntry(currentEntry)
    : null;

  useEffect(() => {
    let cancelled = false;
    const worker = new BG3DGltfWorker();

    const loadPreview = async () => {
      setPreviewScene(null);
      setPreviewError(null);
      const finishWithError = (message: string) => {
        if (!cancelled) {
          setPreviewError(message);
          setPreviewLoading(false);
        }
        worker.terminate();
      };
      if (
        !currentEntry ||
        !currentConfig ||
        !currentEntry.modelMappingFile ||
        !currentEntry.modelMappingPath
      ) {
        worker.terminate();
        return;
      }
      setPreviewLoading(true);
      const modelUrl = `${currentConfig.basePath}/${currentEntry.modelMappingPath}/${currentEntry.modelMappingFile}`;
      const fetchResult = await fromPromise(fetch(modelUrl));
      if (fetchResult.isErr()) {
        finishWithError(fetchResult.error.message);
        return;
      }
      const response = fetchResult.value;
      if (!response.ok) {
        finishWithError(`Failed to load model (${response.status})`);
        return;
      }
      const bufferResult = await fromPromise(response.arrayBuffer());
      if (bufferResult.isErr()) {
        finishWithError(bufferResult.error.message);
        return;
      }

      const workerResult = await fromPromise(
        new Promise<BG3DGltfWorkerResponse>((resolve, reject) => {
          worker.onmessage = (event) => resolve(event.data);
          worker.onerror = (event) =>
            reject(new Error(event.message || "Model conversion worker failed"));
          const arrayBuffer = bufferResult.value;
          worker.postMessage({ type: "bg3d-to-glb", buffer: arrayBuffer }, [arrayBuffer]);
        }),
      );
      if (workerResult.isErr()) {
        finishWithError(workerResult.error.message);
        return;
      }
      const converted = workerResult.value;
      if (converted.type !== "bg3d-to-glb") {
        const message = converted.type === "error" ? converted.error : "Unexpected model conversion result";
        finishWithError(message);
        return;
      }

      const glbBlob = new Blob([converted.result], { type: "model/gltf-binary" });
      const glbUrl = URL.createObjectURL(glbBlob);
      const loader = new GLTFLoader();
      const gltfResult = await fromPromise(loader.loadAsync(glbUrl));
      URL.revokeObjectURL(glbUrl);
      if (gltfResult.isErr()) {
        finishWithError(gltfResult.error.message);
        return;
      }

      if (!cancelled) {
        const modelIndex = currentEntry.modelIndex ?? 0;
        const extracted = extractSubgroupByIndex(
          gltfResult.value,
          modelIndex,
          currentEntry.modelGroupSize,
        );
        setPreviewScene(extracted ?? gltfResult.value.scene);
        setPreviewLoading(false);
      }
      worker.terminate();
    };

    void loadPreview();
    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [currentEntry, currentConfig]);

  const saveReport = (
    decisionState: Record<number, ItemAuditDecision> = decisions,
  ) => {
    const report = createItemAuditReport(selectedGame, decisionState);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.gameName.toLowerCase().replace(/\s+/g, "-")}-item-audit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateDecision = (updater: (current: ItemAuditDecision) => ItemAuditDecision) => {
    if (!currentEntry) {
      return;
    }
    setDecisions((prev) => {
      const existing = prev[currentEntry.itemType] ?? createDecisionForEntry(currentEntry);
      const updated = updater(existing);
      const nextState = { ...prev, [currentEntry.itemType]: updated };
      const atLastItem = currentIndex === entries.length - 1;
      if (
        atLastItem &&
        isEntryFullyRated(updated) &&
        !autoDownloadedRef.current
      ) {
        saveReport(nextState);
        autoDownloadedRef.current = true;
      }
      return nextState;
    });
  };

  return (
    <div className="p-4 text-white bg-gray-900 min-h-full">
      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader>
          <CardTitle>Item Model / Param Audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Game</Label>
              <Select
                value={String(selectedGame)}
                onValueChange={(value) => {
                  const selected = gameConfigs.find((config) => String(config.game) === value);
                  if (selected) {
                    setSelectedGame(selected.game);
                    setCurrentIndex(0);
                    setDecisions({});
                    autoDownloadedRef.current = false;
                  }
                }}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameConfigs.map((config) => (
                    <SelectItem key={config.game} value={String(config.game)}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={saveReport}>Save JSON Report</Button>
            </div>
          </div>

          {currentEntry && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400">
                    Item {currentIndex + 1} of {entries.length}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {currentEntry.itemType}: {currentEntry.itemName}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Model mapping:{" "}
                    {currentEntry.modelMappingFile
                      ? `${currentEntry.modelMappingPath}/${currentEntry.modelMappingFile}`
                      : "Not mapped"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                  >
                    Previous
                  </Button>
                  {currentDecision && isEntryFullyRated(currentDecision) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentIndex((idx) => Math.min(entries.length - 1, idx + 1))
                      }
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>

              <div className="h-64 rounded border border-gray-700 overflow-hidden">
                {previewScene ? (
                  <Canvas camera={{ position: [300, 200, 300], fov: 50, near: 1, far: 50000 }}>
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[10, 20, 5]} intensity={1.2} />
                    <Grid args={[1000, 20]} />
                    <primitive object={previewScene} />
                    <OrbitControls />
                  </Canvas>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-gray-400 px-4 text-center">
                    {previewLoading
                      ? "Loading model preview..."
                      : previewError ?? "No model preview available for this item."}
                  </div>
                )}
              </div>

              {currentEntry.modelCitations.length > 0 && (
                <div className="space-y-2">
                  <Label>Model citations</Label>
                  <div className="space-y-2">
                    {currentEntry.modelCitations.map((citation, index) => (
                      <div key={`${citation.file}:${citation.line}:${index}`} className="rounded border border-gray-700 bg-gray-900 p-2 text-xs">
                        <p className="font-medium">{citation.description}</p>
                        <p>{citation.file}:{citation.line}{citation.endLine ? `-${citation.endLine}` : ""}</p>
                        <a className="text-blue-300 underline" href={citation.permalink} target="_blank" rel="noreferrer">
                          Open source citation
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Model correctness</Label>
                  <StatusSelect
                    value={currentDecision?.modelStatus ?? "unknown"}
                    onChange={(value) =>
                      updateDecision((existing) => ({ ...existing, modelStatus: value }))
                    }
                  />
                </div>
                {PARAM_KEYS.map((key) => (
                  <div className="space-y-2" key={key}>
                    <Label>{key.toUpperCase()} — {currentEntry.paramDetails[key].summary}</Label>
                    <StatusSelect
                      value={currentDecision?.paramStatus[key] ?? "unknown"}
                      onChange={(value) =>
                        updateDecision((existing) => ({
                          ...existing,
                          paramStatus: { ...existing.paramStatus, [key]: value },
                        }))
                      }
                    />
                    {currentEntry.paramDetails[key].citations.map((citation, citationIndex) => (
                      <div key={`${key}-${citation.fileName}-${citation.lineNumber}-${citationIndex}`} className="rounded border border-gray-700 bg-gray-900 p-2 text-xs">
                        <p>{citation.fileName}:{citation.lineNumber}</p>
                        <pre className="whitespace-pre-wrap">{citation.code}</pre>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] rounded border border-gray-700 bg-gray-900 p-2 text-white"
                  value={currentDecision?.notes ?? ""}
                  onChange={(event) =>
                    updateDecision((existing) => ({ ...existing, notes: event.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
