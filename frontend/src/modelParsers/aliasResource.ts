import {
  DEFAULT_BG3D_EXPORT_TARGET,
  type BG3DExportTarget,
  type BG3DAliasResourceTarget,
} from "./bg3dExportTargets";

const ALIS_TEMPLATE_HEX =
  "00000000019C000200000850726F6A6563747300000000000000000000000000000000000000B4AE2C59424400000001926B0B4D616E7469732E626733640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000019283B7341E82424733444F503430000100010000001100000000000000000000000000000009536B656C65746F6E7300000100100001926B0001924B00018DFE00018DD60002003050726F6A656374733A4F74746F3A50726F6A6563743A446174613A536B656C65746F6E733A4D616E7469732E62673364000900A800A86166706D00000000000300180039005900750095009E012A0000000000000000000000000000000000000000000000000000000000000002473400000000000000000000000000000000000000000000000000000850726F6A656374730000000000000000000000000000000000000005427269616E000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000FFFF0000";

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

  buffer.fill(0, start, start + maxLength);
  buffer.set(clipped, start);
}

export function buildAliasResourceHex(
  fileBaseName: string,
  exportTarget: BG3DExportTarget = DEFAULT_BG3D_EXPORT_TARGET,
  companionExtension: "bg3d" | "3df" = exportTarget.companionExtension,
): string {
  let template = hexToBytes(ALIS_TEMPLATE_HEX);
  const targetFullName = `${fileBaseName}.${companionExtension}`;
  const targetPath = `${exportTarget.aliasPathPrefix}${targetFullName}`;
  const nameOffset = 51;
  const pathOffset = 188;
  const newNameBytes = textEncoder.encode(targetFullName);

  const pathBytes = textEncoder.encode(targetPath);
  const pathCapacity = pathBytes.length;

  if (template.length < pathOffset + pathCapacity) {
    const expanded = new Uint8Array(pathOffset + pathCapacity);
    expanded.set(template);
    template = expanded;
  }

  fillAsciiRegion(template, nameOffset, 61, targetFullName);
  template[nameOffset - 1] = newNameBytes.length;

  fillAsciiRegion(template, pathOffset, pathCapacity, targetPath);
  template[pathOffset - 2] = 0;
  template[pathOffset - 1] = Math.min(pathBytes.length, pathCapacity);

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
