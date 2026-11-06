import { Link } from "react-router-dom";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpenLobbyAvailability } from "@/multiplayer/useOpenLobbyAvailability";

export function MultiplayerNavigationLink({ active }: { active: boolean }) {
  const available = useOpenLobbyAvailability();
  return <Button asChild variant={active ? "default" : "ghost"} className="flex items-center gap-2">
    <Link to="/multiplayer" className="text-white">
      <Network className="w-4 h-4" />
      <span>Multiplayer</span>
      {available && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium leading-none text-emerald-200 ring-1 ring-inset ring-emerald-400/40">Open lobby</span>}
    </Link>
  </Button>;
}
