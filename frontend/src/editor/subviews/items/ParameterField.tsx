/**
 * Shared Parameter Editor Component
 * Extracted from ItemMenu.tsx and MightyMikeItemMenu.tsx
 */

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ParamDescription, FlagDescription } from "@/data/items/itemParams";
import { parseU8 } from "@/utils/numberParsers";
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

export function ParameterField({
  paramIndex,
  param,
  value,
  onValueChange,
  onFlagChange,
}: ParameterFieldProps) {
  if (param && typeof param !== "string" && param.type === "TypeSelector") {
    const options = Object.entries(param.options).map(([rawValue, label]) => ({
      value: Number.parseInt(rawValue, 10),
      label,
    }));
    const hasKnownValue = options.some((option) => option.value === value);

    return (
      <div className="flex flex-col gap-2">
        <Select value={value.toString()} onValueChange={(next) => onValueChange(parseU8(next))}>
          <SelectTrigger className="h-7 text-xs">
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
                {option.value}: {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Raw value</span>
          <Input
            type="number"
            className="h-7 text-xs"
            value={value.toString()}
            onChange={(event) => onValueChange(parseU8(event.target.value))}
          />
        </div>
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
          <SelectTrigger className="h-7 text-xs">
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
                {option.value}: {option.degrees}°
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Raw value</span>
          <Input
            type="number"
            className="h-7 text-xs"
            value={value.toString()}
            onChange={(event) => onValueChange(parseU8(event.target.value))}
          />
        </div>
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
        <div className="flex items-center gap-2 mt-1">
          <p>Value:</p>
          <Input
            type="number"
            className="w-24"
            value={value.toString()}
            onChange={(e) => onValueChange(parseU8(e.target.value))}
          />
        </div>
      </div>
    );
  }

  return (
    <Input
      key={`input-${paramIndex}`}
      type="number"
      className="col-span-3"
      value={value.toString()}
      onChange={(e) => onValueChange(parseU8(e.target.value))}
    />
  );
}
