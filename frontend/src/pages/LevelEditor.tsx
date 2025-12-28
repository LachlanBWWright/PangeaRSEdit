import { IntroPrompt } from "../editor/IntroPrompt";
import { IntroText } from "../editor/IntroText";
import { TooltipProvider } from "@/components/ui/tooltip";

export function LevelEditor() {
  return (
    <TooltipProvider>
      <IntroPrompt />
    </TooltipProvider>
  );
}
