const TRACK_CONNECTIONS: readonly string[] = [
  "Right ↔ Left", "Down Right ↔ Left", "Right ↔ Up Left",
  "Down Right ↔ Left", "Down Right ↔ Up Left", "Down ↔ Up Left",
  "Down ↔ Up", "Down ↔ Up", "Down ↔ Up", "Down ↔ Up",
  "Down ↔ Up", "Down Left ↔ Up", "Down Left ↔ Up Right",
  "Left ↔ Up Right", "Left ↔ Right", "Left ↔ Right", "Left ↔ Right",
  "Left ↔ Right", "Left ↔ Right", "Up Left ↔ Right",
  "Up Left ↔ Down Right", "Up ↔ Down Right", "Up ↔ Down", "Up ↔ Down",
  "Up ↔ Down", "Up ↔ Down", "Up ↔ Down", "Up Right ↔ Down",
  "Up Right ↔ Down Left", "Right ↔ Down Left", "Up Right ↔ Left",
  "Right ↔ Down Left", "Right ↔ Left", "Down Right ↔ Left",
  "Down Right ↔ Up Left", "Down ↔ Up Left", "Down ↔ Up", "Down ↔ Up",
  "Down ↔ Up", "Down Left ↔ Up", "Left ↔ Up Right", "Left ↔ Right",
  "Left ↔ Right", "Left ↔ Right", "Up Left ↔ Right",
  "Up Left ↔ Down Right", "Up ↔ Down Right", "Up ↔ Down",
  "Up Right ↔ Down", "Up Right ↔ Down Left", "Up Right ↔ Down Left",
  "Right ↔ Down Left", "Up Right ↔ Down Right", "Down Left ↔ Up Left",
  "Up Right ↔ Up Left", "Up Left ↔ Up Right",
];

export interface MightyMikeTrackSegmentOption {
  readonly value: number;
  readonly label: string;
  readonly connection: string;
  readonly points: string;
}

const TRACK_POINTS_PATTERN =
  /\/\*\s*\d+\s*\*\/\s*\{\s*AIM_[A-Z_]+\s*,\s*AIM_[A-Z_]+\s*,\s*\d+\s*,\s*\{([^}]*)\}\s*,\s*\{([^}]*)\}/gs;

function parseCoordinateList(value: string): number[] {
  return [...value.matchAll(/\d+/g)].map((match) =>
    Number.parseInt(match[0], 10),
  );
}

function extractTrackPointStrings(source: string): string[] {
  return [...source.matchAll(TRACK_POINTS_PATTERN)].map((match) => {
    const xValues = parseCoordinateList(match[1] ?? "");
    const yValues = parseCoordinateList(match[2] ?? "");
    return xValues
      .map((x, index) => `${String(x)},${String(yValues[index] ?? 0)}`)
      .join(" ");
  });
}

const TRACK_POINT_STRINGS = extractTrackPointStrings(raceCarSource);

export const MIGHTY_MIKE_TRACK_SEGMENTS: readonly MightyMikeTrackSegmentOption[] =
  TRACK_CONNECTIONS.map((connection, value) => ({
    value,
    label: `Path ${String(value + 1)} — ${connection}`,
    connection,
    points: TRACK_POINT_STRINGS[value] ?? "",
  }));
import raceCarSource from "../../../../../games/mightymike/src/Enemies/Bargain/RaceCar.c?raw";
