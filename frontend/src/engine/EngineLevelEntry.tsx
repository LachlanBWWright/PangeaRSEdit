import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/config/useFeatureFlags";

export function EngineLevelEntry() {
  const flags = useFeatureFlags();
  if (!flags.luaEngine) return null;
  return <section className="w-full flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300/30 bg-slate-800 px-5 py-4" aria-label="Lua Engine levels">
    <div><h2 className="font-semibold text-white">Lua Engine</h2><p className="text-sm text-slate-300">Edit scene terrain and collision geometry, then test your Lua gameplay.</p></div>
    <Link to="/engine/levels" className="rounded bg-amber-300 px-4 py-2 font-medium text-slate-950 focus-visible:outline-2">Open engine level editor</Link>
  </section>;
}
