import {
  DEFAULT_BG3D_EXPORT_TARGET,
  type BG3DExportTarget,
  type BG3DAliasResourceTarget,
} from "./bg3dExportTargets";

const OTTO_BLOB_ALIAS_TEMPLATE_HEX: Record<"3df" | "bg3d", string> = {
  "3df":
    "00000000019A000200000850726F6A6563747300000000000000000000000000000000000000B4AE2C5942440000000150C308426C6F622E336466000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001749AB6F8DB6233444D464F503430000100010000001100000000000000000000000000000009536B656C65746F6E730000010010000150C3000150B500014EEE00014EED0002002D50726F6A656374733A4F74746F3A50726F6A6563743A446174613A536B656C65746F6E733A426C6F622E33646600000900A800A86166706D00000000000300180039005900750095009E012A0000000000000000000000000000000000000000000000000000000000000002473400000000000000000000000000000000000000000000000000000000000850726F6A656374730000000000000000000000000000000000000005427269616E000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000FFFF0000",
  bg3d:
    "00000000019A000200000850726F6A6563747300000000000000000000000000000000000000B4AE2C5942440000000150C309426C6F622E626733640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001749BB6F8DB69424733444F503430000100010000001100000000000000000000000000000009536B656C65746F6E730000010010000150C3000150B500014EEE00014EED0002002E50726F6A656374733A4F74746F3A50726F6A6563743A446174613A536B656C65746F6E733A426C6F622E62673364000900A800A86166706D00000000000300180039005900750095009E012A0000000000000000000000000000000000000000000000000000000000000002473400000000000000000000000000000000000000000000000000000000000850726F6A656374730000000000000000000000000000000000000005427269616E000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000FFFF0000",
};

const textEncoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function fillAsciiRegion(
  buffer: Uint8Array,
  start: number,
  maxLength: number,
  value: string,
): void {
  const replacement = textEncoder.encode(value);
  const clipped = replacement.length > maxLength ? replacement.subarray(0, maxLength) : replacement;
  if (clipped.length < replacement.length) {
    console.warn(
      `Alias text '${value}' exceeded template capacity of ${maxLength} bytes and was truncated`,
    );
  }

  buffer.set(clipped, start);
}

export function buildAliasResourceHex(
  fileBaseName: string,
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
  companionExtension: "bg3d" | "3df" = exportTarget.companionExtension,
): string {
  const templateHex = OTTO_BLOB_ALIAS_TEMPLATE_HEX[companionExtension];
  let template = hexToBytes(templateHex);
  const targetFullName = `${fileBaseName}.${companionExtension}`;
  const targetPath = `${exportTarget.aliasPathPrefix}${targetFullName}`;
  const nameOffset = 51;
  const pathOffset = 188;
  const nameSlotLength = 61;
  const pathSlotLength = Math.max(48, textEncoder.encode(targetPath).length);
  const newNameBytes = textEncoder.encode(targetFullName);

  const pathBytes = textEncoder.encode(targetPath);

  if (template.length < pathOffset + pathSlotLength) {
    const expanded = new Uint8Array(pathOffset + pathSlotLength);
    expanded.set(template);
    template = expanded;
  }

  fillAsciiRegion(template, nameOffset, nameSlotLength, targetFullName);
  template[nameOffset - 1] = newNameBytes.length;

  fillAsciiRegion(template, pathOffset, pathSlotLength, targetPath);
  template[pathOffset - 2] = 0;
  template[pathOffset - 1] = pathBytes.length;

  return bytesToHex(template);
}

export function buildAliasResourceEntry(
  fileBaseName: string,
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
): Record<string, { name: string; order: number; data: string }> {
  const aliasTargets: BG3DAliasResourceTarget[] = exportTarget.aliasResources ?? [
    {
      resourceId: exportTarget.aliasResourceId,
      name: exportTarget.aliasName,
      companionExtension: exportTarget.companionExtension,
    },
  ];

  return aliasTargets.reduce(
    (acc, target) => {
      acc[target.resourceId.toString()] = {
        name: target.name,
        order: target.resourceId,
        data: buildAliasResourceHex(
          fileBaseName,
          exportTarget,
          target.companionExtension,
        ),
      };
      return acc;
    },
    {} as Record<string, { name: string; order: number; data: string }>,
  );
}
