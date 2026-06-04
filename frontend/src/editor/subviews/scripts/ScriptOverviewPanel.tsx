import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ScriptOverviewSample {
  id: string;
  label: string;
  description: string;
}

interface ScriptOverviewPanelProps {
  globalHooksCount: number;
  itemBindingsCount: number;
  sourceFilesCount: number;
  customObjectsCount: number;
  samples: readonly ScriptOverviewSample[];
  onLoadSample: (sampleId: string, sampleLabel: string) => void;
}

export function ScriptOverviewPanel({
  globalHooksCount,
  itemBindingsCount,
  sourceFilesCount,
  customObjectsCount,
  samples,
  onLoadSample,
}: ScriptOverviewPanelProps) {
  return (
    <div className="grid gap-3">
      <Card className="border-slate-800 bg-slate-950/70">
        <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Global Hooks", globalHooksCount],
            ["Item Bindings", itemBindingsCount],
            ["Source Files", sourceFilesCount],
            ["Custom Objects", customObjectsCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {label}
              </p>
              <p className="text-xl font-semibold text-white">{String(value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Samples</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="rounded-lg border border-slate-800 bg-slate-900/80 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{sample.label}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {sample.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLoadSample(sample.id, sample.label)}
                >
                  Load
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}