import { Button } from "@/components/ui/button";
import type { ParamStatus } from "./itemAuditUtils";

interface StatusSelectProps {
  value: ParamStatus;
  onChange: (value: ParamStatus) => void;
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === "correct" ? "default" : "outline"}
        onClick={() => onChange("correct")}
      >
        Correct
      </Button>
      <Button
        type="button"
        variant={value === "incorrect" ? "destructive" : "outline"}
        onClick={() => onChange("incorrect")}
      >
        Incorrect
      </Button>
    </div>
  );
}
