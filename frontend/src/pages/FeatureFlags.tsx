import { Flag, Network } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { setFeatureFlags } from "@/config/featureFlags";
import { useFeatureFlags } from "@/config/useFeatureFlags";

export function FeatureFlagsPage() {
  const featureFlags = useFeatureFlags();

  const handleMultiplayerChange = (enabled: boolean) => {
    const result = setFeatureFlags({
      ...featureFlags,
      multiplayer: enabled,
    });

    result.match(
      () =>
        toast.success(
          enabled ? "Multiplayer enabled" : "Multiplayer disabled",
        ),
      (error) => toast.error(error.message),
    );
  };

  const handleScriptingChange = (enabled: boolean) => {
    const result = setFeatureFlags({
      ...featureFlags,
      scripting: enabled,
    });

    result.match(
      () => toast.success(enabled ? "Scripting enabled" : "Scripting disabled"),
      (error) => toast.error(error.message),
    );
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8 text-slate-100">
      <div className="mb-8 flex items-start gap-3">
        <div className="rounded-lg bg-indigo-500/15 p-2.5 text-indigo-300">
          <Flag className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Feature flags</h1>
          <p className="mt-1 text-sm text-slate-400">
            Opt into experiences that are still under active development.
            Preferences are saved in this browser.
          </p>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-800/70 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base">Experimental experiences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <div className="flex min-w-0 gap-3">
              <Network className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div>
                <label
                  htmlFor="multiplayer-feature-flag"
                  className="font-medium text-slate-100"
                >
                  Multiplayer experience
                </label>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  Show multiplayer navigation and allow access to online lobbies.
                  A running backend service is also required.
                </p>
              </div>
            </div>
            <Switch
              id="multiplayer-feature-flag"
              checked={featureFlags.multiplayer}
              onCheckedChange={handleMultiplayerChange}
              aria-label="Toggle multiplayer experience"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <div>
              <label htmlFor="scripting-feature-flag-page" className="font-medium text-slate-100">
                Scripting tools
              </label>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Show incomplete, in-development scripting tools in the level editor.
              </p>
            </div>
            <Switch
              id="scripting-feature-flag-page"
              checked={featureFlags.scripting}
              onCheckedChange={handleScriptingChange}
              aria-label="Toggle scripting tools"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
