import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/config/useFeatureFlags";
import type { GlobalsInterface } from "@/data/globals/globals";
import { SCRIPTING_SAMPLE_LEVELS, type ScriptingSampleLevel } from "../subviews/scripts/scriptSampleLevels";

export function ScriptingSampleButtons({ globals, onOpen }: {
  readonly globals: GlobalsInterface;
  readonly onOpen?: (sample: ScriptingSampleLevel) => void;
}) {
  const flags = useFeatureFlags();
  if (!flags.sampleScriptingLevels || !onOpen) return null;
  return <div className="mt-3 flex min-w-0 flex-col gap-2" aria-label={`${globals.GAME_NAME} scripting samples`}>
    <p className="text-xs font-medium text-slate-400">Sample scripting levels</p>
    {SCRIPTING_SAMPLE_LEVELS.filter((sample) => sample.globals.GAME_TYPE === globals.GAME_TYPE).map((sample) => (
      <Button key={sample.id} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => onOpen(sample)}>
        <span className="min-w-0"><span className="block font-medium">{sample.title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-400">{sample.description}</span></span>
      </Button>
    ))}
  </div>;
}
