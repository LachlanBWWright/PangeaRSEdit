/**
 * Shared Parameter Editor Component
 * Extracted from ItemMenu.tsx and MightyMikeItemMenu.tsx
 */

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { ParamSpecWithFlags, FlagDescription } from "@/data/items/itemParams";
import { parseU8 } from "@/utils/parseNumber";

interface ParameterFieldProps {
  paramIndex: number;
  param: ParamSpecWithFlags | string | undefined;
  value: number;
  onValueChange: (value: number) => void;
  onFlagChange?: (flagIndex: number, checked: boolean) => void;
}

export function ParameterField({
  paramIndex,
  param,
  value,
  onValueChange,
  onFlagChange,
}: ParameterFieldProps) {
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
                      onFlagChange(flag.index, !!checked);
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
