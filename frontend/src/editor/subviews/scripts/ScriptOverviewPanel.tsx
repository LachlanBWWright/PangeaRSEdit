import { Button } from "@/components/ui/button";
import { ScriptFieldHelpTooltip } from "./ScriptFieldHelpTooltip";

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
    <div className="grid gap-8 py-2">
      <dl className="grid divide-y divide-slate-800 border-y border-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
          {[
            ["Global Hooks", globalHooksCount],
            ["Item Bindings", itemBindingsCount],
            ["Source Files", sourceFilesCount],
            ["Custom Objects", customObjectsCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {label}
              </dt>
              <dd className="text-xl font-semibold text-white">
                {String(value)}
              </dd>
            </div>
          ))}
      </dl>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-semibold text-white">Samples</h3>
          <ScriptFieldHelpTooltip label="About script samples">
            Loading a sample replaces the current scripting workspace.
          </ScriptFieldHelpTooltip>
        </div>
        <div className="divide-y divide-slate-800 border-y border-slate-800">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="flex items-center justify-between gap-4 px-1 py-3"
            >
              <p className="font-medium text-white" title={sample.description}>{sample.label}</p>
              <Button size="sm" variant="ghost" onClick={() => onLoadSample(sample.id, sample.label)}>
                Load
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
