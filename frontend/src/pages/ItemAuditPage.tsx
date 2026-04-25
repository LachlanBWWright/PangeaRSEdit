import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Group } from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Game } from "@/data/globals/globals";
import { ResultAsync } from "neverthrow";
import { getGameMapper } from "@/data/items/mappers";
import {
  buildItemAuditEntries,
  createDecisionForEntry,
  createItemAuditReport,
  getItemAuditConfig,
  getItemAuditConfigs,
  type ItemAuditDecision,
} from "./itemAuditUtils";
import { mapErr } from "@/utils/mapErr";
import { StatusSelect } from "./itemAuditStatusSelect";
import {
  firstIncompleteIndex,
  isEntryFullyRated,
  loadPreviewScene,
  PARAM_KEYS,
  parseImportedDecisions,
} from "./itemAuditPageHelpers";

export function ItemAuditPage() {
  const gameConfigs = getItemAuditConfigs();
  const [selectedGame, setSelectedGame] = useState<Game>(Game.OTTO_MATIC);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, ItemAuditDecision>>(
    {},
  );
  const [previewScene, setPreviewScene] = useState<Group | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const autoDownloadedRef = useRef(false);
  const [previewParams, setPreviewParams] = useState({
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  });

  const entries = useMemo(
    () => buildItemAuditEntries(selectedGame, decisions),
    [selectedGame, decisions],
  );
  const currentEntry = entries[currentIndex];
  const currentConfig = getItemAuditConfig(selectedGame);
  const mapper = getGameMapper(selectedGame);
  const previewMapping = useMemo(() => {
    if (!currentEntry || !mapper) {
      return undefined;
    }
    return mapper.getMapping(currentEntry.itemType, undefined, previewParams);
  }, [currentEntry, mapper, previewParams]);
  const currentDecision = currentEntry
    ? (decisions[currentEntry.itemType] ?? createDecisionForEntry(currentEntry))
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setPreviewScene(null);
      setPreviewError(null);
      setPreviewLoading(true);
      const preview = await loadPreviewScene(
        currentEntry
          ? {
              modelIndex: currentEntry.modelIndex ?? undefined,
              modelGroupSize: currentEntry.modelGroupSize,
            }
          : null,
        currentConfig,
        previewMapping,
      );
      if (!cancelled) {
        setPreviewScene(preview.scene);
        setPreviewError(preview.error);
        setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [currentEntry, currentConfig, previewMapping]);

  const saveReport = (
    decisionState: Record<number, ItemAuditDecision> = decisions,
  ) => {
    const report = createItemAuditReport(selectedGame, decisionState);
    const payload = { ...report, currentIndex };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.gameName.toLowerCase().replace(/\s+/g, "-")}-item-audit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importReport = (file: File | null) => {
    if (!file) {
      return;
    }
    setImportStatus("Importing audit report...");
    const loadReport = async () => {
      const textResult = await ResultAsync.fromPromise(file.text(), mapErr);
      if (textResult.isErr()) {
        setImportStatus(`Failed to read file: ${textResult.error}`);
        return;
      }
      const parsedResult = await ResultAsync.fromPromise(
        Promise.resolve().then(() => JSON.parse(textResult.value)),
        mapErr,
      );
      if (parsedResult.isErr()) {
        setImportStatus(`Invalid JSON: ${parsedResult.error}`);
        return;
      }
      const parsed = parsedResult.value;
      const gameValue = Reflect.get(parsed, "game");
      const entriesValue = Reflect.get(parsed, "entries");
      const progressIndex = Reflect.get(parsed, "currentIndex");
      if (typeof gameValue !== "number" || !Array.isArray(entriesValue)) {
        setImportStatus("Invalid report format: expected game and entries.");
        return;
      }
      const nextDecisions = parseImportedDecisions(entriesValue);
      const selectedConfig = gameConfigs.find(
        (config) => config.game === gameValue,
      );
      if (!selectedConfig) {
        setImportStatus("Report game is not supported in this build.");
        return;
      }
      setSelectedGame(selectedConfig.game);
      setDecisions(nextDecisions);
      const importedEntries = buildItemAuditEntries(
        selectedConfig.game,
        nextDecisions,
      );
      if (
        typeof progressIndex === "number" &&
        progressIndex >= 0 &&
        progressIndex < importedEntries.length
      ) {
        setCurrentIndex(progressIndex);
      } else {
        setCurrentIndex(firstIncompleteIndex(importedEntries));
      }
      autoDownloadedRef.current = false;
      setImportStatus("Audit report imported successfully.");
    };

    void loadReport();
  };

  const updateDecision = (
    updater: (current: ItemAuditDecision) => ItemAuditDecision,
  ) => {
    if (!currentEntry) {
      return;
    }
    setDecisions((prev) => {
      const existing =
        prev[currentEntry.itemType] ?? createDecisionForEntry(currentEntry);
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
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl mb-4">
        <CardHeader className="border-b border-gray-700">
          <CardTitle className="text-xl">Item Model / Param Audit</CardTitle>
          <p className="text-sm text-gray-300">
            Mark each field as correct/incorrect to identify hallucinated
            mappings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 bg-gray-900/60 rounded-lg border border-gray-700 p-3">
            <div>
              <Label>Game</Label>
              <Select
                value={String(selectedGame)}
                onValueChange={(value) => {
                  const selected = gameConfigs.find(
                    (config) => String(config.game) === value,
                  );
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
            <div className="flex flex-col items-end justify-end gap-2">
              <Input
                type="file"
                accept="application/json"
                className="max-w-xs"
                onChange={(event) =>
                  importReport(event.target.files?.[0] ?? null)
                }
              />
              <Button onClick={() => saveReport()}>Save JSON Report</Button>
              {importStatus && (
                <p className="text-xs text-gray-300 max-w-xs text-right">
                  {importStatus}
                </p>
              )}
            </div>
          </div>

          {currentEntry && (
            <div className="space-y-4">
              <div className="flex justify-between items-center rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                <div>
                  <p className="text-sm text-gray-400">
                    Item {currentIndex + 1} of {entries.length}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {currentEntry.itemType}: {currentEntry.itemName}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Model mapping:{" "}
                    {previewMapping?.modelFile
                      ? `${previewMapping.modelPath}/${previewMapping.modelFile}`
                      : "Not mapped"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentIndex((idx) => Math.max(0, idx - 1))
                    }
                  >
                    Previous
                  </Button>
                  {currentDecision && isEntryFullyRated(currentDecision) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentIndex((idx) =>
                          Math.min(entries.length - 1, idx + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                {PARAM_KEYS.map((key) => (
                  <div key={`preview-${key}`} className="space-y-1">
                    <Label>{key.toUpperCase()} Preview</Label>
                    <Input
                      type="number"
                      value={previewParams[key]}
                      onChange={(event) =>
                        setPreviewParams((prev) => {
                          const parsedValue = Number.parseInt(
                            event.target.value || "0",
                            10,
                          );
                          return {
                            ...prev,
                            [key]: Number.isNaN(parsedValue) ? 0 : parsedValue,
                          };
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="h-64 rounded-lg border border-gray-700 overflow-hidden bg-black/30">
                {previewScene ? (
                  <Canvas
                    camera={{
                      position: [300, 200, 300],
                      fov: 50,
                      near: 1,
                      far: 50000,
                    }}
                  >
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
                      : (previewError ??
                        "No model preview available for this item.")}
                  </div>
                )}
              </div>

              {previewMapping && (
                <div className="text-xs text-gray-300 grid md:grid-cols-3 gap-2 rounded border border-gray-700 bg-gray-900/60 p-3">
                  <p>Model Index: {previewMapping.modelIndex}</p>
                  <p>Group Size: {previewMapping.groupSize ?? 1}</p>
                  <p>Rotation Y: {previewMapping.rotationY ?? 0}</p>
                </div>
              )}

              {currentEntry.modelCitations.length > 0 && (
                <div className="space-y-2 rounded border border-gray-700 bg-gray-900/60 p-3">
                  <Label>Model citations</Label>
                  <div className="space-y-2">
                    {currentEntry.modelCitations.map((citation, index) => (
                      <div
                        key={`${citation.file}:${citation.line}:${index}`}
                        className="rounded border border-gray-700 bg-gray-900 p-2 text-xs"
                      >
                        <p className="font-medium">{citation.description}</p>
                        <p>
                          {citation.file}:{citation.line}
                          {citation.endLine ? `-${citation.endLine}` : ""}
                        </p>
                        <a
                          className="text-blue-300 underline"
                          href={citation.permalink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open source citation
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3 rounded border border-gray-700 bg-gray-900/50 p-3">
                <div className="space-y-2">
                  <Label>Model correctness</Label>
                  <StatusSelect
                    value={currentDecision?.modelStatus ?? "unknown"}
                    onChange={(value) =>
                      updateDecision((existing) => ({
                        ...existing,
                        modelStatus: value,
                      }))
                    }
                  />
                </div>
                {PARAM_KEYS.map((key) => (
                  <div className="space-y-2" key={key}>
                    <Label>
                      {key.toUpperCase()} —{" "}
                      {currentEntry.paramDetails[key].summary}
                    </Label>
                    <StatusSelect
                      value={currentDecision?.paramStatus[key] ?? "unknown"}
                      onChange={(value) =>
                        updateDecision((existing) => ({
                          ...existing,
                          paramStatus: {
                            ...existing.paramStatus,
                            [key]: value,
                          },
                        }))
                      }
                    />
                    {currentEntry.paramDetails[key].citations.map(
                      (citation, citationIndex) => (
                        <div
                          key={`${key}-${citation.fileName}-${citation.lineNumber}-${citationIndex}`}
                          className="rounded border border-gray-700 bg-gray-900 p-2 text-xs"
                        >
                          <p>
                            {citation.fileName}:{citation.lineNumber}
                          </p>
                          <pre className="whitespace-pre-wrap">
                            {citation.code}
                          </pre>
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded border border-gray-700 bg-gray-900/60 p-3">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] rounded border border-gray-700 bg-gray-900 p-2 text-white"
                  value={currentDecision?.notes ?? ""}
                  onChange={(event) =>
                    updateDecision((existing) => ({
                      ...existing,
                      notes: event.target.value,
                    }))
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
