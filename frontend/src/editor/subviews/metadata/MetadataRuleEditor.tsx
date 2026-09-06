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
  readonly isOverridden: boolean;
  readonly disabled?: boolean;
  readonly onOverrideChange: (isOverridden: boolean) => void;
  readonly onChange: (value: string) => void;
}

export function MetadataRuleEditor({
  rule,
  value,
  isOverridden,
  disabled = false,
  onOverrideChange,
  onChange,
}: Props) {
  const control: MetadataControl = rule.control;
  const overrideControl = (
    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-400">
      <Checkbox
        aria-label={`Override ${rule.label}`}
        checked={isOverridden}
        disabled={disabled}
        onCheckedChange={(checked) => onOverrideChange(checked === true)}
      />
      Override
    </label>
  );
  if (control.kind === "checkbox") {
    return (
      <div className="flex items-center gap-3">
        {overrideControl}
        <label className="flex items-center gap-1.5 text-xs text-slate-200">
          <Checkbox
            aria-label={rule.label}
            checked={value === "true"}
            disabled={disabled || !isOverridden}
            onCheckedChange={(checked) => onChange(checked === true ? "true" : "false")}
          />
          Enabled
        </label>
      </div>
    );
  }
  if (control.kind === "slider") {
    const parsedValue = Number.parseFloat(value);
    const sliderValue = Number.isFinite(parsedValue)
      ? Math.min(control.max, Math.max(control.min, parsedValue))
      : control.min;
    return (
      <div className="flex min-w-56 items-center gap-3">
        {overrideControl}
        <Slider
          aria-label={rule.label}
          max={control.max}
          min={control.min}
          disabled={disabled || !isOverridden}
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
      <div className="flex items-center gap-3">
        {overrideControl}
        <Select disabled={disabled || !isOverridden} value={value} onValueChange={onChange}>
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
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {overrideControl}
      <Input
        aria-label={rule.label}
        className="h-7 min-w-56 text-xs"
        disabled={disabled || !isOverridden}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
