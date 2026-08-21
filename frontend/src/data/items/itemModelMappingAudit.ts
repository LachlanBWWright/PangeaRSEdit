import { Game } from "../globals/globals";

export type ItemModelAuditDisposition =
  | "marker"
  | "procedural"
  | "custom-rendered"
  | "path-registration";

export interface ItemModelAuditEntry {
  readonly game: Game;
  readonly kind: "terrainItem" | "splineItem";
  readonly itemType: number;
  readonly disposition: ItemModelAuditDisposition;
  readonly source: string;
  readonly reason: string;
}

const entries: readonly ItemModelAuditEntry[] = [
  // Otto Matic
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 0, disposition: "marker", source: "src/Terrain/Terrain2.c:50", reason: "Start coordinate marker." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 2, disposition: "procedural", source: "src/Items/SpacePods.c:76-101", reason: "Invisible event generator; spawned pods are separate runtime objects." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 5, disposition: "custom-rendered", source: "src/Items/Powerups.c:122-160", reason: "Atom uses CUSTOM_GENRE and sprite-material drawing." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 35, disposition: "marker", source: "src/Terrain/Terrain2.c:84; src/Terrain/SplineItems.c:84", reason: "Terrain entry is NilAdd; visible Magnet Monster is the spline item." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 40, disposition: "marker", source: "src/Terrain/Terrain2.c:89; src/Terrain/SplineItems.c:89", reason: "Terrain entry is NilAdd; visible Moving Platform is the spline item." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 47, disposition: "custom-rendered", source: "src/Items/items2.c:139-171", reason: "Cloud platform uses an event object with DrawCloudPlatform." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 79, disposition: "marker", source: "src/Terrain/Terrain2.c:126; src/Terrain/SplineItems.c:129", reason: "Terrain entry is NilAdd; visible Clown Fish is the spline enemy." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 86, disposition: "marker", source: "src/Terrain/Terrain2.c:133", reason: "Source labels this entry as unknown and uses NilAdd." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 88, disposition: "procedural", source: "src/Items/Volcano.c:341-359", reason: "Invisible event zone that triggers hill generation." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 91, disposition: "custom-rendered", source: "src/Effects/Sparkle.c:442-469", reason: "Runway lights are sparkle nodes, not model objects." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 99, disposition: "custom-rendered", source: "src/Effects/Effects.c:1671-1700", reason: "Smoker is an event-driven particle effect." },
  { game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 103, disposition: "marker", source: "src/Terrain/Terrain2.c:152; src/Terrain/SplineItems.c:153", reason: "Terrain entry is NilAdd; visible Rail Gun is the spline item." },

  // Bugdom
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 0, disposition: "marker", source: "src/Terrain/Terrain2.c:49", reason: "Start coordinate marker." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 14, disposition: "custom-rendered", source: "src/Items/Liquids.c:265-373", reason: "Water patch uses a generated custom mesh." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 27, disposition: "custom-rendered", source: "src/Items/Liquids.c:751-753", reason: "Honey patch delegates to generated liquid-patch geometry." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 42, disposition: "marker", source: "src/Terrain/Terrain2.c:91", reason: "Firefly target marker uses NilAdd." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 43, disposition: "custom-rendered", source: "src/Items/Traps.c:737-774", reason: "Fire wall is an event object whose runtime draw is procedural." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 50, disposition: "marker", source: "src/Items/Items2.c:980-986", reason: "Rock ledge routine is an explicit no-op." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 55, disposition: "custom-rendered", source: "src/Items/Liquids.c:758-760", reason: "Slime patch delegates to generated liquid-patch geometry." },
  { game: Game.BUGDOM, kind: "terrainItem", itemType: 56, disposition: "custom-rendered", source: "src/Items/Liquids.c:765-767", reason: "Lava patch delegates to generated liquid-patch geometry." },

  // Bugdom 2
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 0, disposition: "marker", source: "Source/Terrain/Terrain2.c:46", reason: "Start coordinate marker." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 22, disposition: "procedural", source: "Source/Enemies/Enemy_Snake.c:161-176", reason: "Snake generator creates custom-drawn runtime snakes." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 25, disposition: "marker", source: "Source/Terrain/Terrain2.c:76", reason: "Unknown NilAdd entry." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 40, disposition: "marker", source: "Source/Terrain/Terrain2.c:88; Source/Terrain/SplineItems.c:87", reason: "Terrain entry is NilAdd; Slot Car is created on the spline." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 58, disposition: "marker", source: "Source/Terrain/Terrain2.c:106; Source/Terrain/SplineItems.c:105", reason: "Terrain entry is NilAdd; Vacuum is created on the spline." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 63, disposition: "marker", source: "Source/Terrain/Terrain2.c:111; Source/Terrain/SplineItems.c:110", reason: "Terrain entry is NilAdd; Hanger is created on the spline." },
  { game: Game.BUGDOM_2, kind: "terrainItem", itemType: 72, disposition: "custom-rendered", source: "Source/Effects/Particles.c:1386-1410", reason: "Bubbler is an event-driven particle effect." },
  { game: Game.BUGDOM_2, kind: "splineItem", itemType: 60, disposition: "path-registration", source: "Source/Enemies/Enemy_Moth.c:582-597", reason: "Moth path only registers a spline for terrain moths; it creates no visible object." },

  // Nanosaur
  { game: Game.NANOSAUR, kind: "terrainItem", itemType: 0, disposition: "marker", source: "Source/Terrain/Terrain2.c", reason: "Start coordinate marker; no other unmapped entry is defined." },

  // Nanosaur 2
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 0, disposition: "marker", source: "Source/Terrain/Terrain2.c:53", reason: "Start coordinate marker." },
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 16, disposition: "custom-rendered", source: "Source/Items/DustDevil.c:323-351", reason: "Dust Devil uses a hidden CUSTOM_GENRE object and procedural particles." },
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 34, disposition: "custom-rendered", source: "Source/Effects/Particles.c:1531-1562", reason: "Smoker is an event-driven particle effect." },
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 35, disposition: "custom-rendered", source: "Source/Effects/Particles.c:1769-1786", reason: "Flame uses CUSTOM_GENRE and a custom draw callback." },
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 46, disposition: "custom-rendered", source: "Source/Items/Holes.c:53-69", reason: "Hole is an event controller that emits procedural worms and dirt." },
  { game: Game.NANOSAUR_2, kind: "terrainItem", itemType: 48, disposition: "marker", source: "Source/Terrain/Terrain2.c:100; Source/Terrain/SplineItems.c:94", reason: "Terrain entry is NilAdd; visible Ramphor is the spline enemy." },
  { game: Game.NANOSAUR_2, kind: "splineItem", itemType: 16, disposition: "custom-rendered", source: "Source/Items/DustDevil.c:602-630", reason: "Spline Dust Devil shares the procedural custom effect." },
  { game: Game.NANOSAUR_2, kind: "splineItem", itemType: 49, disposition: "path-registration", source: "Source/Terrain/SplineItems.c:95; Source/System/Main.c:852-870", reason: "Time-demo control spline, not a visible object." },

  // Cro-Mag Rally
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 0, disposition: "marker", source: "Source/Terrain/Terrain2.c:47", reason: "Start coordinate marker." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 10, disposition: "marker", source: "Source/Terrain/Liquids.c:231-273", reason: "Waterfall model code is disabled; source states the waterfall was removed." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 18, disposition: "marker", source: "Source/Terrain/Terrain2.c:65; Source/Terrain/SplineItems.c:64", reason: "Terrain entry is NilAdd; Yeti is created on the spline." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 19, disposition: "procedural", source: "Source/3D/Effects.c:1758-1785", reason: "Lava generator is an event trigger that emits procedural lava." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 23, disposition: "marker", source: "Source/Terrain/Terrain2.c:70; Source/Terrain/SplineItems.c:69", reason: "Terrain entry is NilAdd; Camel is created on the spline." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 28, disposition: "procedural", source: "Source/3D/Effects.c:1669-1748", reason: "Bubble generator is an event trigger that emits procedural bubbles." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 35, disposition: "marker", source: "Source/Terrain/Terrain2.c:82; Source/Terrain/SplineItems.c:81", reason: "Terrain entry is NilAdd; Beetle is created on the spline." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 53, disposition: "marker", source: "Source/Terrain/SplineItems.c:99", reason: "Shark is a spline-only enemy." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 54, disposition: "marker", source: "Source/Terrain/SplineItems.c:100", reason: "Troll is a spline-only enemy." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 58, disposition: "marker", source: "Source/Terrain/SplineItems.c:104", reason: "Pteradactyl is a spline-only enemy." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 61, disposition: "marker", source: "Source/Terrain/SplineItems.c:107", reason: "Mummy is a spline-only enemy." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 64, disposition: "marker", source: "Source/Terrain/SplineItems.c:110", reason: "Polar Bear is a spline-only enemy." },
  { game: Game.CRO_MAG, kind: "terrainItem", itemType: 66, disposition: "marker", source: "Source/Terrain/SplineItems.c:112", reason: "Viking is a spline-only enemy." },

  // Billy Frontier
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 0, disposition: "marker", source: "Source/Terrain/Terrain2.c:46", reason: "Start coordinate marker." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 15, disposition: "custom-rendered", source: "Source/Effects/Particles.c:1760-1780", reason: "Flame uses a custom particle draw callback." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 16, disposition: "custom-rendered", source: "Source/Effects/Particles.c:1487-1494", reason: "Smoker is an event-driven particle effect." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 20, disposition: "marker", source: "Source/Terrain/Terrain2.c:69; Source/Terrain/SplineItems.c:65", reason: "Terrain entry is NilAdd; Kanga is created on the spline." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 22, disposition: "marker", source: "Source/Terrain/Terrain2.c:71; Source/Terrain/SplineItems.c:67", reason: "Terrain entry is NilAdd; spline entry is a camera controller." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 23, disposition: "marker", source: "Source/Terrain/Terrain2.c:72; Source/Terrain/SplineItems.c:68", reason: "Terrain entry is NilAdd; Walker is created on the spline." },
  { game: Game.BILLY_FRONTIER, kind: "terrainItem", itemType: 34, disposition: "marker", source: "Source/Terrain/SplineItems.c:79", reason: "Kanga Rex is a spline-only enemy." },
  { game: Game.BILLY_FRONTIER, kind: "splineItem", itemType: 22, disposition: "path-registration", source: "Source/3D/Camera.c:807-840", reason: "Stampede camera controller creates no visible model." },
];

const auditByKey = new Map(
  entries.map((entry) => [`${entry.game}:${entry.kind}:${entry.itemType}`, entry]),
);

export function getItemModelAuditEntry(
  game: Game,
  kind: ItemModelAuditEntry["kind"],
  itemType: number,
): ItemModelAuditEntry | undefined {
  return auditByKey.get(`${game}:${kind}:${itemType}`);
}

export function getItemModelAuditEntries(): readonly ItemModelAuditEntry[] {
  return entries;
}
