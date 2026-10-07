import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseObjectNumberDraft } from "./scriptObjectNumbers";

interface Props {
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  readonly onCommit: (value: number) => void;
}

export function ScriptObjectNumberField({ label, value, min = 0, max = 32767, integer = false, onCommit }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const commit = () => {
    if (draft === null) return;
    const result = parseObjectNumberDraft(draft, min, max, integer);
    if (result.isErr()) {
      setError(result.error);
      return;
    }
    onCommit(result.value);
    setDraft(null);
    setError("");
  };
  return <div className="grid gap-1">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type="number" value={draft ?? value} min={min} max={max} step={integer ? 1 : 0.05}
      aria-invalid={error.length > 0} aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") { setDraft(null); setError(""); }
      }} />
    {error ? <p id={`${id}-error`} className="text-xs text-red-300">{error}</p> : null}
  </div>;
}
