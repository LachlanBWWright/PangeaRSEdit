import type { Nanosaur1LevelData } from "../../src/data/processors/classicProprocessor";

export interface NanosaurBinaryDifferenceLocation {
  section: string;
  field: string;
  record?: number;
}

export interface NanosaurBinaryDifferenceRange {
  start: number;
  endExclusive: number;
  length: number;
  original: number;
  roundtrip: number;
  lastOriginal: number;
  lastRoundtrip: number;
  location: NanosaurBinaryDifferenceLocation;
  lastLocation: NanosaurBinaryDifferenceLocation;
}

interface BinarySection {
  name: string;
  start: number;
  endExclusive: number;
}

const HEADER_FIELDS: readonly [string, number, number][] = [
  ["textureLayerOffset", 0, 4],
  ["heightmapLayerOffset", 4, 4],
  ["pathLayerOffset", 8, 4],
  ["objectListOffset", 12, 4],
  ["unknown1", 16, 4],
  ["heightmapTilesOffset", 20, 4],
  ["unknown2", 24, 4],
  ["width", 28, 2],
  ["depth", 30, 2],
  ["textureAttribOffset", 32, 4],
  ["tileAnimDataOffset", 36, 4],
];

function addSection(
  sections: BinarySection[],
  name: string,
  start: number,
  endExclusive: number,
  byteLength: number,
): void {
  if (start < 0 || endExclusive <= start || start >= byteLength) return;
  sections.push({
    name,
    start,
    endExclusive: Math.min(endExclusive, byteLength),
  });
}

function sectionsForLevel(
  level: Nanosaur1LevelData,
  byteLength: number,
): BinarySection[] {
  const { header } = level;
  const layerByteLength = header.width * header.depth * 2;
  const sections: BinarySection[] = [];
  addSection(sections, "header", 0, 40, byteLength);
  addSection(
    sections,
    "texture layer",
    header.textureLayerOffset,
    header.textureLayerOffset + layerByteLength,
    byteLength,
  );
  addSection(
    sections,
    "heightmap layer",
    header.heightmapLayerOffset,
    header.heightmapLayerOffset + layerByteLength,
    byteLength,
  );
  addSection(
    sections,
    "path layer",
    header.pathLayerOffset,
    header.pathLayerOffset + layerByteLength,
    byteLength,
  );
  addSection(
    sections,
    "object list",
    header.objectListOffset,
    header.objectListOffset + 4 + level.objectList.length * 20,
    byteLength,
  );
  addSection(
    sections,
    "heightmap tiles",
    header.heightmapTilesOffset,
    header.textureAttribOffset,
    byteLength,
  );
  addSection(
    sections,
    "texture attributes",
    header.textureAttribOffset,
    header.tileAnimDataOffset,
    byteLength,
  );
  addSection(
    sections,
    "tile animation data",
    header.tileAnimDataOffset,
    byteLength,
    byteLength,
  );
  return sections.sort((left, right) => left.start - right.start);
}

function locationForOffset(
  offset: number,
  level: Nanosaur1LevelData,
  byteLength: number,
): NanosaurBinaryDifferenceLocation {
  const sections = sectionsForLevel(level, byteLength);
  const section = sections.find(
    (candidate) =>
      offset >= candidate.start && offset < candidate.endExclusive,
  );
  if (!section) {
    return { section: "unclassified", field: `byte[${offset}]` };
  }

  const relativeOffset = offset - section.start;
  if (section.name === "header") {
    const headerField = HEADER_FIELDS.find(
      ([, fieldOffset, fieldLength]) =>
        relativeOffset >= fieldOffset &&
        relativeOffset < fieldOffset + fieldLength,
    );
    return {
      section: section.name,
      field: headerField?.[0] ?? `byte[${relativeOffset}]`,
    };
  }

  if (section.name === "object list") {
    if (relativeOffset < 4) return { section: section.name, field: "count" };
    const itemRelativeOffset = relativeOffset - 4;
    const record = Math.floor(itemRelativeOffset / 20);
    const fieldOffset = itemRelativeOffset % 20;
    const field =
      fieldOffset < 2
        ? "x"
        : fieldOffset < 4
          ? "y/z"
          : fieldOffset < 6
            ? "type"
            : fieldOffset < 10
            ? "parm"
              : fieldOffset < 12
                ? "flags"
                : fieldOffset < 16
                  ? "prevItemIdx"
                  : fieldOffset < 20
                    ? "nextItemIdx"
                    : `byte[${fieldOffset}]`;
    return { section: section.name, record, field };
  }

  if (section.name === "texture attributes") {
    const record = Math.floor(relativeOffset / 8);
    const fieldOffset = relativeOffset % 8;
    const field =
      fieldOffset < 2
        ? "bits"
        : fieldOffset < 4
          ? "parm0"
          : fieldOffset === 4
            ? "parm1"
            : fieldOffset === 5
              ? "parm2"
              : "undefined";
    return { section: section.name, record, field };
  }

  if (section.name === "heightmap tiles") {
    const record = Math.floor(relativeOffset / (32 * 32));
    return {
      section: section.name,
      record,
      field: `byte[${relativeOffset % (32 * 32)}]`,
    };
  }

  if (section.name === "texture layer" || section.name === "heightmap layer") {
    return {
      section: section.name,
      field: `tile[${Math.floor(relativeOffset / 2)}]`,
    };
  }

  if (section.name === "path layer") {
    return {
      section: section.name,
      field: `tile[${Math.floor(relativeOffset / 2)}]`,
    };
  }

  return { section: section.name, field: `byte[${relativeOffset}]` };
}

function sameLocation(
  left: NanosaurBinaryDifferenceLocation,
  right: NanosaurBinaryDifferenceLocation,
): boolean {
  return (
    left.section === right.section &&
    left.field === right.field &&
    left.record === right.record
  );
}

export function findNanosaurBinaryDifferenceRanges(
  original: Uint8Array,
  roundtrip: Uint8Array,
  level: Nanosaur1LevelData,
): NanosaurBinaryDifferenceRange[] {
  const ranges: NanosaurBinaryDifferenceRange[] = [];
  const commonLength = Math.min(original.length, roundtrip.length);
  for (let offset = 0; offset < commonLength; offset++) {
    const originalByte = original[offset];
    const roundtripByte = roundtrip[offset];
    if (originalByte === roundtripByte) continue;

    const location = locationForOffset(offset, level, commonLength);
    const previous = ranges[ranges.length - 1];
    if (
      previous &&
      previous.endExclusive === offset &&
      sameLocation(previous.lastLocation, location)
    ) {
      previous.endExclusive = offset + 1;
      previous.length += 1;
      previous.lastOriginal = originalByte ?? 0;
      previous.lastRoundtrip = roundtripByte ?? 0;
      previous.lastLocation = location;
      continue;
    }

    ranges.push({
      start: offset,
      endExclusive: offset + 1,
      length: 1,
      original: originalByte ?? 0,
      roundtrip: roundtripByte ?? 0,
      lastOriginal: originalByte ?? 0,
      lastRoundtrip: roundtripByte ?? 0,
      location,
      lastLocation: location,
    });
  }

  if (original.length !== roundtrip.length) {
    const start = commonLength;
    const endExclusive = Math.max(original.length, roundtrip.length);
    ranges.push({
      start,
      endExclusive,
      length: endExclusive - start,
      original: original[start] ?? -1,
      roundtrip: roundtrip[start] ?? -1,
      lastOriginal: original[original.length - 1] ?? -1,
      lastRoundtrip: roundtrip[roundtrip.length - 1] ?? -1,
      location: { section: "file length", field: "byte range" },
      lastLocation: { section: "file length", field: "byte range" },
    });
  }

  return ranges;
}

function formatLocation(location: NanosaurBinaryDifferenceLocation): string {
  const record = location.record === undefined ? "" : `[${location.record}]`;
  return `${location.section}${record}.${location.field}`;
}

export function formatNanosaurBinaryDifferenceRanges(
  ranges: readonly NanosaurBinaryDifferenceRange[],
  limit = 8,
): string {
  const shown = ranges.slice(0, limit).map((range) => {
    const start = `0x${range.start.toString(16).padStart(6, "0")}`;
    const end = `0x${(range.endExclusive - 1).toString(16).padStart(6, "0")}`;
    const first = `${range.original.toString(16).padStart(2, "0")}→${range.roundtrip.toString(16).padStart(2, "0")}`;
    const location = sameLocation(range.location, range.lastLocation)
      ? formatLocation(range.location)
      : `${formatLocation(range.location)}..${formatLocation(range.lastLocation)}`;
    return `${start}-${end} ${location} ${first}`;
  });
  const remainder = ranges.length - shown.length;
  return remainder > 0
    ? `${shown.join(", ")}; ... ${remainder} more range(s)`
    : shown.join(", ");
}
