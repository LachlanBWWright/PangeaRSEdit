import { IntroPrompt } from "../editor/IntroPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";

export function LevelEditor() {
  return (
    <TooltipProvider>
      <IntroPrompt />
    </TooltipProvider>
  );
}
