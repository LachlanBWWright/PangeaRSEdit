import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  getMetadataValueLabel,
  type MetadataControl,
  type MetadataRule,
} from "./levelMetadataRules";

interface Props {
  readonly rule: MetadataRule;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function MetadataRuleEditor({ rule, value, onChange }: Props) {
  const control: MetadataControl = rule.control;
  if (control.kind === "checkbox") {
    return (
      <Checkbox
        aria-label={rule.label}
        checked={value === "true"}
        onCheckedChange={(checked) => onChange(checked === true ? "true" : "false")}
      />
    );
  }
  if (control.kind === "slider") {
    const parsedValue = Number.parseFloat(value);
    const sliderValue = Number.isFinite(parsedValue)
      ? Math.min(control.max, Math.max(control.min, parsedValue))
      : control.min;
    return (
      <div className="flex min-w-56 items-center gap-3">
        <Slider
          aria-label={rule.label}
          max={control.max}
          min={control.min}
          onValueChange={(nextValue) => {
            const next = nextValue[0];
            if (next !== undefined) onChange(String(next));
          }}
          step={control.step}
          value={[sliderValue]}
        />
        <span className="w-16 text-right font-mono text-xs">{value}</span>
      </div>
    );
  }
  if (control.kind === "select") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={rule.label} className="h-7 min-w-48 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {control.options.map((option) => (
            <SelectItem key={option} value={option}>
              {control.optionLabels?.[option] ?? getMetadataValueLabel(option, rule.key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      aria-label={rule.label}
      className="h-7 min-w-56 text-xs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
