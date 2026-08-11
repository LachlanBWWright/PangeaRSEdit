import { Checkbox } from "@/components/ui/checkbox";

interface ItemStateFlag {
  readonly mask: number;
  readonly label: string;
}

function getFlagLabel(description: string, name: string): string | null {
  const marker = `${name}:`;
  const start = description.indexOf(marker);
  if (start < 0) return null;
  const valueStart = start + marker.length;
  const valueEnd = description.indexOf("|", valueStart);
  return description.slice(valueStart, valueEnd < 0 ? undefined : valueEnd).trim();
}

export function getEditableItemStateFlags(description: string): ItemStateFlag[] {
  return [
    { name: "ITEM_FLAGS_USER1", mask: 1 << 0 },
    { name: "ITEM_FLAGS_USER2", mask: 1 << 1 },
    { name: "ITEM_FLAGS_USER3", mask: 1 << 2 },
  ].flatMap(({ name, mask }) => {
    const label = getFlagLabel(description, name);
    return label ? [{ mask, label }] : [];
  });
}

export function ItemStateFlags({
  description,
  value,
  onChange,
}: {
  readonly description: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  const flags = getEditableItemStateFlags(description);
  if (flags.length === 0) return null;

  return (
    <fieldset className="rounded border border-gray-700 p-2">
      <legend className="px-1 text-sm text-gray-300">Saved state</legend>
      <div className="flex flex-col gap-1">
        {flags.map((flag) => (
          <label key={flag.mask} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={(value & flag.mask) !== 0}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true ? value | flag.mask : value & ~flag.mask,
                )
              }
            />
            <span>{flag.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
