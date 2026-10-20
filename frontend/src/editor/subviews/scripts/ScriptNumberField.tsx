import { useId, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function ScriptNumberField({ label, value, min = 0, max = 32767, step = 1, onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState({ base: value, text: String(value) });
  const text = draft.base === value ? draft.text : String(value);
  const parsed = Number(text);
  const valid = text.trim().length > 0 && Number.isFinite(parsed) && parsed >= min && parsed <= max && (step !== 1 || Number.isInteger(parsed));
  return <div className="workbench-field"><label htmlFor={id}>{label}</label><Input id={id} type="number" min={min} max={max} step={step} value={text}
    aria-invalid={!valid} onChange={(event) => setDraft({ base: value, text: event.target.value })}
    onBlur={() => { if (valid) onChange(parsed); else setDraft({ base: value, text: String(value) }); }} /></div>;
}
