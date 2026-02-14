import { useMemo, useState } from "react";
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
import {
  buildItemAuditEntries,
  createDefaultDecision,
  createItemAuditReport,
  getItemAuditConfigs,
  type ItemAuditDecision,
  type ParamStatus,
} from "./itemAuditUtils";

interface StatusSelectProps {
  value: ParamStatus;
  onChange: (value: ParamStatus) => void;
}

function isParamStatus(value: string): value is ParamStatus {
  return value === "unknown" || value === "correct" || value === "incorrect";
}

function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isParamStatus(next)) {
          onChange(next);
        }
      }}
    >
      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unknown">Unknown</SelectItem>
        <SelectItem value="correct">Correct</SelectItem>
        <SelectItem value="incorrect">Incorrect</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ItemAuditPage() {
  const gameConfigs = getItemAuditConfigs();
  const [selectedGame, setSelectedGame] = useState<Game>(Game.OTTO_MATIC);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, ItemAuditDecision>>({});

  const entries = useMemo(
    () => buildItemAuditEntries(selectedGame, decisions),
    [selectedGame, decisions],
  );
  const currentEntry = entries[currentIndex];

  const updateDecision = (updater: (current: ItemAuditDecision) => ItemAuditDecision) => {
    if (!currentEntry) {
      return;
    }
    setDecisions((prev) => {
      const existing = prev[currentEntry.itemType] ?? createDefaultDecision();
      return { ...prev, [currentEntry.itemType]: updater(existing) };
    });
  };

  const saveReport = () => {
    const report = createItemAuditReport(selectedGame, decisions);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.gameName.toLowerCase().replace(/\s+/g, "-")}-item-audit.json`;
    anchor.click();
    URL.revokeObjectURL(url);
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
                  setSelectedGame(Number(value) as Game);
                  setCurrentIndex(0);
                  setDecisions({});
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
                    Model mapping: {currentEntry.modelMappingFile ?? "Not mapped"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentIndex((idx) => Math.min(entries.length - 1, idx + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Model correctness</Label>
                  <StatusSelect
                    value={currentEntry.decision.modelStatus}
                    onChange={(value) =>
                      updateDecision((existing) => ({ ...existing, modelStatus: value }))
                    }
                  />
                </div>
                {(["p0", "p1", "p2", "p3"] as const).map((key) => (
                  <div className="space-y-2" key={key}>
                    <Label>
                      {key.toUpperCase()} — {currentEntry.paramDescriptions[key]}
                    </Label>
                    <StatusSelect
                      value={currentEntry.decision.paramStatus[key]}
                      onChange={(value) =>
                        updateDecision((existing) => ({
                          ...existing,
                          paramStatus: { ...existing.paramStatus, [key]: value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] rounded border border-gray-700 bg-gray-900 p-2 text-white"
                  value={currentEntry.decision.notes}
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
