import { Boxes, FlaskConical, Network, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setFeatureFlags, type FeatureFlags } from "@/config/featureFlags";
import { useFeatureFlags } from "@/config/useFeatureFlags";

function saveFeatureFlags(flags: FeatureFlags): void {
  setFeatureFlags(flags).match(
    () => undefined,
    (error) => toast.error(error.message),
  );
}

export function SettingsMenu() {
  const featureFlags = useFeatureFlags();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-white hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 border-slate-700 bg-slate-800 p-2 text-slate-100"
      >
        <DropdownMenuLabel className="pb-2 pt-1">
          <span>Settings</span>
          <p className="mt-1 text-xs leading-4 text-amber-300">
            These features are incomplete and still in active development. They
            are unfinished and not functional
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuCheckboxItem
          checked={featureFlags.multiplayer}
          onCheckedChange={(multiplayer) =>
            saveFeatureFlags({ ...featureFlags, multiplayer })
          }
          onSelect={(event) => event.preventDefault()}
          className="items-start py-2 focus:bg-slate-700/60"
        >
          <Network className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="block font-medium">Show multiplayer</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-400">
              Show multiplayer navigation and enable online lobbies.
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={featureFlags.scripting}
          onCheckedChange={(scripting) =>
            saveFeatureFlags({ ...featureFlags, scripting })
          }
          onSelect={(event) => event.preventDefault()}
          className="items-start py-2 focus:bg-slate-700/60"
        >
          <FlaskConical className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="block font-medium">Show scripting</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-400">
              Show experimental scripting tools in the level editor.
            </span>
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={featureFlags.itemModelMappingPreview}
          onCheckedChange={(itemModelMappingPreview) =>
            saveFeatureFlags({ ...featureFlags, itemModelMappingPreview })
          }
          onSelect={(event) => event.preventDefault()}
          className="items-start py-2 focus:bg-slate-700/60"
        >
          <Boxes className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="block font-medium">Show item model preview</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-400">
              Show the experimental terrain and spline item mapping preview.
            </span>
          </span>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
