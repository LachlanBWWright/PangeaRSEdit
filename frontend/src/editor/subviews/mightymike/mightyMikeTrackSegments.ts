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
}

export const MIGHTY_MIKE_TRACK_SEGMENTS: readonly MightyMikeTrackSegmentOption[] =
  TRACK_CONNECTIONS.map((connection, value) => ({
    value,
    label: `Path ${String(value + 1)} — ${connection}`,
    connection,
  }));
