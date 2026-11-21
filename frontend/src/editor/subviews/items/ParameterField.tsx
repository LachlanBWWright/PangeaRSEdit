/**
 * Shared Parameter Editor Component
 * Extracted from ItemMenu.tsx and MightyMikeItemMenu.tsx
 */

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ParamDescription, FlagDescription } from "@/data/items/itemParams";
import { parseU8 } from "@/utils/numberParsers";
import { getParamLabel } from "./itemMenuState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParameterFieldProps {
  paramIndex: number;
  param: ParamDescription | undefined;
  value: number;
  onValueChange: (value: number) => void;
  onFlagChange?: (flag: FlagDescription, checked: boolean) => void;
}

function RawParameter({ value, onValueChange }: Pick<ParameterFieldProps, "value" | "onValueChange">) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Advanced</summary>
      <label className="mt-2 flex items-center gap-2">
        <span className="shrink-0">Raw value</span>
        <Input type="number" className="h-7 w-24 text-xs" value={value} onChange={(event) => onValueChange(parseU8(event.target.value))} />
      </label>
    </details>
  );
}

export function ParameterField({
  paramIndex,
  param,
  value,
  onValueChange,
  onFlagChange,
}: ParameterFieldProps) {
  const accessibleName = getParamLabel(paramIndex, param);
  if (param && typeof param !== "string" && param.type === "TypeSelector") {
    const options = Object.entries(param.options).map(([rawValue, label]) => ({
      value: Number.parseInt(rawValue, 10),
      label,
    }));
    const hasKnownValue = options.some((option) => option.value === value);

    return (
      <div className="flex flex-col gap-2">
        <Select value={value.toString()} onValueChange={(next) => onValueChange(parseU8(next))}>
          <SelectTrigger aria-label={accessibleName} className="h-7 text-xs">
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
            {!hasKnownValue && (
              <SelectItem value={value.toString()}>
                Custom ({value})
              </SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RawParameter value={value} onValueChange={onValueChange} />
      </div>
    );
  }

  if (param && typeof param !== "string" && param.type === "Rotation") {
    const options = Array.from({ length: param.divisions }, (_, rotation) => ({
      value: rotation,
      degrees: Math.round((rotation * 360) / param.divisions),
    }));
    const hasKnownValue = options.some((option) => option.value === value);

    return (
      <div className="flex flex-col gap-2">
        <Select value={value.toString()} onValueChange={(next) => onValueChange(parseU8(next))}>
          <SelectTrigger aria-label={accessibleName} className="h-7 text-xs">
            <SelectValue placeholder="Select rotation" />
          </SelectTrigger>
          <SelectContent>
            {!hasKnownValue && (
              <SelectItem value={value.toString()}>
                Custom ({value})
              </SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.degrees}°
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RawParameter value={value} onValueChange={onValueChange} />
      </div>
    );
  }

  if (
    param &&
    typeof param !== "string" &&
    param.type === "Bit Flags" &&
    Array.isArray(param.flags)
  ) {
    return (
      <div key={`flags-${paramIndex}`} className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-2">
          {param.flags.map((flag: FlagDescription) => {
            const checked = (value & (1 << flag.index)) !== 0;
            return (
              <label key={flag.index} className="inline-flex items-center gap-1">
                <Checkbox
                  className="font-bold"
                  checked={checked}
                  onCheckedChange={(checked) => {
                    if (onFlagChange) {
                      onFlagChange(flag, checked === true);
                    } else {
                      const mask = 1 << flag.index;
                      onValueChange(checked ? value | mask : value & ~mask);
                    }
                  }}
                />
                <span>{flag.description}</span>
              </label>
            );
          })}
        </div>
        <RawParameter value={value} onValueChange={onValueChange} />
      </div>
    );
  }

  return (
    <Input
      key={`input-${paramIndex}`}
      type="number"
      aria-label={accessibleName}
      className="col-span-3"
      value={value.toString()}
      onChange={(e) => onValueChange(parseU8(e.target.value))}
    />
  );
}
