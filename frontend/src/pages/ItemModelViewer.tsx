import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { Box3, Group, MathUtils, Mesh, Vector3 } from "three";
import { Boxes, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Game, type GlobalsInterface, OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals, Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals } from "@/data/globals/globals";
import { getGameMapper, getGamesWithMappers } from "@/data/items/mappers";
import type { ItemModelKind, UniversalItemModelMapping } from "@/data/items/itemModelTypes";
import { getCitationPermalink } from "@/data/items/itemModelTypes";
import { DEFAULT_ITEM_MODEL_PARAMS, resolveItemModelPreview } from "@/data/items/itemModelPreview";
import { getItemModelAuditEntry } from "@/data/items/itemModelMappingAudit";
import { getItemModelParameterControls, setItemModelBit } from "@/data/items/itemModelPreviewControls";
import { useItemModelCache } from "@/editor/threejs/hooks/useItemModelCache";
import { presentItemModel } from "@/editor/threejs/itemModelPresentation";
import type { ItemModelParams } from "@/editor/threejs/hooks/itemModelCacheKey";

interface GameOption { readonly id: Game; readonly name: string; readonly globals: GlobalsInterface; }
const ALL_GAMES: readonly GameOption[] = [
  { id: Game.OTTO_MATIC, name: "Otto Matic", globals: OttoGlobals }, { id: Game.BUGDOM, name: "Bugdom", globals: BugdomGlobals },
  { id: Game.BUGDOM_2, name: "Bugdom 2", globals: Bugdom2Globals }, { id: Game.NANOSAUR, name: "Nanosaur", globals: NanosaurGlobals },
  { id: Game.NANOSAUR_2, name: "Nanosaur 2", globals: Nanosaur2Globals }, { id: Game.CRO_MAG, name: "Cro-Mag Rally", globals: CroMagGlobals },
  { id: Game.BILLY_FRONTIER, name: "Billy Frontier", globals: BillyFrontierGlobals },
];
const GAME_OPTIONS = ALL_GAMES.filter((game) => getGamesWithMappers().includes(game.id));
const KINDS: readonly { value: ItemModelKind; label: string }[] = [{ value: "terrainItem", label: "Terrain item" }, { value: "splineItem", label: "Spline item" }];

interface PreviewItem {
  readonly type: number;
  readonly name: string;
  readonly hasMapping: boolean;
  readonly auditDisposition?: string;
}
interface Bounds { readonly center: [number, number, number]; readonly radius: number; }

function itemsFor(game: GameOption, kind: ItemModelKind): readonly PreviewItem[] {
  const source = kind === "terrainItem" ? game.globals.ITEM_TYPES : game.globals.SPLINE_ITEM_TYPES ?? {};
  const mapper = getGameMapper(game.id);
  return Object.entries(source).flatMap(([rawType, name]) => {
    const type = Number.parseInt(rawType, 10);
    if (Number.isNaN(type)) return [];
    const hasMapping = mapper?.getMapping(type, undefined, DEFAULT_ITEM_MODEL_PARAMS, undefined, kind) !== undefined;
    const audit = hasMapping ? undefined : getItemModelAuditEntry(game.id, kind, type);
    return [{ type, name, hasMapping, auditDisposition: audit?.disposition }];
  }).sort((left, right) => left.type - right.type);
}

function boundsFor(scene: Group): Bounds | null {
  const box = new Box3().setFromObject(scene);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new Vector3());
  return { center: [center.x, center.y, center.z], radius: Math.max(box.getSize(new Vector3()).length() / 2, 1) };
}

function statsFor(scene: Group | null): { vertices: number; faces: number } | null {
  if (!scene) return null;
  let vertices = 0; let faces = 0;
  scene.traverse((object) => { if (!(object instanceof Mesh)) return; const positions = object.geometry.getAttribute("position"); if (!positions) return; vertices += positions.count; faces += (object.geometry.getIndex()?.count ?? positions.count) / 3; });
  return { vertices, faces };
}

function fitCamera(cameraLike: object, bounds: Bounds, aspect: number): void {
  const distance = Math.max(bounds.radius / Math.tan(MathUtils.degToRad(50) / 2), bounds.radius * 1.2) * Math.max(1, 1 / aspect);
  const position = Reflect.get(cameraLike, "position");
  if (position !== null && typeof position === "object") {
    const setPosition = Reflect.get(position, "set");
    if (typeof setPosition === "function") Reflect.apply(setPosition, position, [bounds.center[0] + distance, bounds.center[1] + distance * 0.7, bounds.center[2] + distance]);
  }
  const lookAt = Reflect.get(cameraLike, "lookAt");
  if (typeof lookAt === "function") Reflect.apply(lookAt, cameraLike, bounds.center);
  Reflect.set(cameraLike, "near", Math.max(0.05, distance - bounds.radius * 2));
  Reflect.set(cameraLike, "far", distance + bounds.radius * 4);
  const updateProjectionMatrix = Reflect.get(cameraLike, "updateProjectionMatrix");
  if (typeof updateProjectionMatrix === "function") Reflect.apply(updateProjectionMatrix, cameraLike, []);
}

function CameraFit({ bounds, version }: { bounds: Bounds | null; version: number }) {
  const { camera, size } = useThree();
  const controls = useRef<{ target: Vector3; minDistance: number; maxDistance: number; update: () => void } | null>(null);
  React.useEffect(() => {
    if (!bounds) return;
    const aspect = size.width / Math.max(size.height, 1);
    fitCamera(camera, bounds, aspect);
    if (controls.current) { controls.current.target.set(...bounds.center); controls.current.minDistance = bounds.radius * 1.05; controls.current.maxDistance = Math.max(bounds.radius * 4, controls.current.minDistance + 10); controls.current.update(); }
  }, [bounds, camera, size.height, size.width, version]);
  return <OrbitControls ref={controls} makeDefault />;
}

function ModelViewport({ scene, bounds, version }: { scene: Group | null; bounds: Bounds | null; version: number }) {
  return <Canvas camera={{ fov: 50, near: 0.05, far: 50000, position: [300, 200, 300] }}><color attach="background" args={["#111827"]} /><ambientLight intensity={0.8} /><directionalLight position={[400, 500, 300]} intensity={1.4} /><Grid args={[1000, 20]} cellSize={50} sectionSize={200} fadeDistance={2000} /><CameraFit bounds={bounds} version={version} />{scene ? <primitive object={scene} /> : null}</Canvas>;
}

function MappingSummary({ game, mapping, audit }: { game: Game; mapping: UniversalItemModelMapping | undefined; audit: ReturnType<typeof getItemModelAuditEntry> }) {
  if (!mapping) {
    if (!audit) return <p className="text-sm text-slate-400">No mapping resolves for this request.</p>;
    return <div className="space-y-1 text-sm text-amber-200"><div>Audited disposition: {audit.disposition}</div><div>{audit.reason}</div><div className="text-xs text-slate-400">Source: <code>{audit.source}</code></div></div>;
  }
  return <div className="space-y-1 text-sm text-slate-300"><div>Path: <code>{mapping.modelPath}/{mapping.modelFile}</code></div><div>Model index: {mapping.modelIndex} · group size: {mapping.groupSize ?? 1}</div>{mapping.modelParts && <div>Parts: {mapping.modelParts.map((part) => part.partId).join(", ")}</div>}<div>Scale: {mapping.scale ?? 1} · XZ: {mapping.scaleXZ ?? 1} · Y: {mapping.scaleY ?? 1}</div><div>Rotation: {mapping.rotationY ?? 0} rad · Y offset: {mapping.yOffset ?? 0}</div><div>Verification: {mapping.verificationStatus ?? "unspecified"}{mapping.lightingMode === "unlit" ? " · unlit" : ""}</div>{mapping.staticAnalysisIssues?.map((issue) => <div key={issue.message} className={issue.severity === "error" ? "text-red-300" : "text-amber-300"}>{issue.severity}: {issue.message}</div>)}{mapping.citations && <div>Citations: {mapping.citations.map((citation) => <a className="mr-2 text-cyan-300 underline" href={getCitationPermalink(game, citation)} key={`${citation.file}:${citation.line}`} target="_blank" rel="noreferrer">{citation.file}:{citation.line}</a>)}</div>}</div>;
}

function ParameterControls({ mapping, params, flags, onParam, onFlags }: { mapping: UniversalItemModelMapping | undefined; params: ItemModelParams; flags: number; onParam: (key: "p0" | "p1" | "p2" | "p3", value: number) => void; onFlags: (value: number) => void }) {
  return <div className="space-y-3">{getItemModelParameterControls(mapping, params, flags).map((control) => {
    if (control.key === "flags" && control.domain.kind === "bitset") return <div className="space-y-2" key={control.key}><Label className="text-slate-300">{control.domain.summary}</Label>{control.domain.bits.map((bit) => <label className="flex items-center gap-2 text-sm text-slate-300" key={bit.index}><Checkbox checked={(flags & (1 << bit.index)) !== 0} onCheckedChange={(checked) => onFlags(setItemModelBit(flags, bit.index, checked === true))} />{bit.label}</label>)}</div>;
    if (control.key === "flags") return null;
    if (control.domain.kind === "enum") return <div className="space-y-1" key={control.key}><Label className="text-slate-300">{control.domain.summary}</Label><Select value={String(control.value)} onValueChange={(value) => onParam(control.key, Number(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{control.domain.values.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
    const min = control.domain.kind === "integer" ? control.domain.min : undefined; const max = control.domain.kind === "integer" ? control.domain.max : undefined;
    return <div className="space-y-1" key={control.key}><Label className="text-slate-300">{control.domain.summary}</Label><Input type="number" min={min} max={max} value={control.value} onChange={(event) => onParam(control.key, Number(event.target.value))} /></div>;
  })}</div>;
}

export function ItemModelViewer() {
  const [searchParams] = useSearchParams(); const captureMode = searchParams.get("capture") === "1";
  const [gameId, setGameId] = useState<Game | null>(null); const [kind, setKind] = useState<ItemModelKind>("terrainItem"); const [itemType, setItemType] = useState<number | null>(null); const [search, setSearch] = useState(""); const [params, setParams] = useState<ItemModelParams>(DEFAULT_ITEM_MODEL_PARAMS); const [flags, setFlags] = useState(0); const [levelNum, setLevelNum] = useState<number | undefined>(); const [scene, setScene] = useState<Group | null>(null); const [bounds, setBounds] = useState<Bounds | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const [fitVersion, setFitVersion] = useState(0); const requestVersion = useRef(0);
  const selectedGame = GAME_OPTIONS.find((option) => option.id === gameId); const mapper = gameId === null ? undefined : getGameMapper(gameId); const items = useMemo(() => selectedGame ? itemsFor(selectedGame, kind) : [], [kind, selectedGame]); const visibleItems = items.filter((item) => `${item.type} ${item.name}`.toLowerCase().includes(search.toLowerCase())); const resolution = gameId === null || itemType === null ? undefined : resolveItemModelPreview({ game: gameId, kind, itemType, levelNum, params, flags }); const mapping = resolution?.kind === "resolved" ? resolution.value.mapping : undefined; const levelDependent = itemType !== null && mapper?.isLevelDependent?.(itemType) === true; const { loadModel } = useItemModelCache(gameId ?? Game.OTTO_MATIC);
  const reset = useCallback((nextGame: Game | null, nextKind: ItemModelKind) => { requestVersion.current += 1; setGameId(nextGame); setKind(nextKind); setItemType(null); setParams(DEFAULT_ITEM_MODEL_PARAMS); setFlags(0); setLevelNum(undefined); setScene(null); setBounds(null); setError(null); }, []);
  const invalidatePreview = useCallback(() => { requestVersion.current += 1; setScene(null); setBounds(null); }, []);
  const selectItem = useCallback((nextType: number) => { requestVersion.current += 1; setItemType(nextType); setScene(null); setBounds(null); setParams(DEFAULT_ITEM_MODEL_PARAMS); setFlags(0); }, []);
  const loadAdjacentItem = useCallback(async (nextType: number) => {
    if (gameId === null) return;
    const nextParams = DEFAULT_ITEM_MODEL_PARAMS;
    const nextResolution = resolveItemModelPreview({ game: gameId, kind, itemType: nextType, levelNum, params: nextParams, flags });
    if (nextResolution.kind !== "resolved") return;
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setLoading(true);
    setError(null);
    const loaded = await loadModel(nextType, nextParams, levelNum, kind, flags);
    if (version !== requestVersion.current) return;
    if (!loaded) {
      setLoading(false);
      setError(`Unable to load ${nextResolution.value.mapping.modelFile}. Check the mapping and model asset.`);
      return;
    }
    const displayed = presentItemModel(loaded, nextResolution.value.mapping, nextParams);
    setScene(displayed);
    setBounds(boundsFor(displayed));
    setFitVersion((current) => current + 1);
    setLoading(false);
  }, [flags, gameId, kind, levelNum, loadModel]);
  const selectedVisibleIndex = visibleItems.findIndex((item) => item.type === itemType);
  const selectAdjacentItem = useCallback((direction: -1 | 1) => {
    const nextIndex = selectedVisibleIndex < 0
      ? (direction === 1 ? 0 : visibleItems.length - 1)
      : selectedVisibleIndex + direction;
    const nextItem = visibleItems[nextIndex];
    if (nextItem) {
      selectItem(nextItem.type);
      void loadAdjacentItem(nextItem.type);
    }
  }, [loadAdjacentItem, selectItem, selectedVisibleIndex, visibleItems]);
  const loadPreview = useCallback(async () => { if (gameId === null || itemType === null || !mapping) return; const version = requestVersion.current + 1; requestVersion.current = version; setLoading(true); setError(null); const loaded = await loadModel(itemType, params, levelNum, kind, flags); if (version !== requestVersion.current) return; if (!loaded) { setLoading(false); setError(`Unable to load ${mapping.modelFile}. Check the mapping and model asset.`); return; } const displayed = presentItemModel(loaded, mapping, params); setScene(displayed); setBounds(boundsFor(displayed)); setFitVersion((current) => current + 1); setLoading(false); }, [flags, gameId, itemType, kind, levelNum, loadModel, mapping, params]);
  const audit = gameId === null || itemType === null ? undefined : getItemModelAuditEntry(gameId, kind, itemType);
  const stats = statsFor(scene); const requestText = gameId === null || itemType === null ? "Select a game and item" : JSON.stringify({ game: gameId, kind, itemType, levelNum, params, flags });
  return <div className="flex h-full min-h-0 gap-4 bg-gray-900 p-4">{!captureMode && <Card className="w-[26rem] shrink-0 overflow-auto border-gray-700 bg-gray-800"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><Boxes className="h-5 w-5" />Item-to-model mapping preview</CardTitle><p className="text-sm text-slate-400">Experimental diagnostic view using the editor’s shared mapping and model pipeline.</p></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label className="text-slate-300">Game</Label><Select value={gameId === null ? "" : String(gameId)} onValueChange={(value) => reset(Number(value), kind)}><SelectTrigger><SelectValue placeholder="Select a game" /></SelectTrigger><SelectContent>{GAME_OPTIONS.map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label className="text-slate-300">Item kind</Label><Select value={kind} onValueChange={(value) => reset(gameId, value === "splineItem" ? "splineItem" : "terrainItem")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>{selectedGame && <><div className="space-y-2"><Label className="text-slate-300">Search items</Label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or numeric type" /></div><div className="space-y-2"><Label className="text-slate-300">Item</Label><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-1"><Button type="button" size="icon" variant="outline" aria-label="Previous item" disabled={selectedVisibleIndex <= 0} onClick={() => selectAdjacentItem(-1)}><ChevronLeft className="h-4 w-4" /></Button><Select value={itemType === null ? "" : String(itemType)} onValueChange={(value) => selectItem(Number(value))}><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger><SelectContent>{visibleItems.map((item) => <SelectItem key={item.type} value={String(item.type)}>{item.type}: {item.name}{item.hasMapping ? " ✓" : item.auditDisposition ? ` — audited ${item.auditDisposition}` : " — unmapped"}</SelectItem>)}</SelectContent></Select><Button type="button" size="icon" variant="outline" aria-label="Next item" disabled={selectedVisibleIndex < 0 || selectedVisibleIndex >= visibleItems.length - 1} onClick={() => selectAdjacentItem(1)}><ChevronRight className="h-4 w-4" /></Button></div></div></>}{levelDependent && <div className="space-y-2"><Label className="text-slate-300">Level</Label><Select value={levelNum === undefined ? "" : String(levelNum)} onValueChange={(value) => { invalidatePreview(); setLevelNum(Number(value)); }}><SelectTrigger><SelectValue placeholder="Choose a level" /></SelectTrigger><SelectContent>{Array.from({ length: 11 }, (_, level) => <SelectItem key={level} value={String(level)}>{level}</SelectItem>)}</SelectContent></Select></div>}<ParameterControls mapping={mapping} params={params} flags={flags} onFlags={(value) => { invalidatePreview(); setFlags(value); }} onParam={(key, value) => { invalidatePreview(); setParams((current) => ({ ...current, [key]: value })); }} /><Button className="w-full" disabled={loading || !mapping} onClick={() => void loadPreview()}>{loading ? "Loading model…" : "Load model"}</Button>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<MappingSummary game={gameId ?? Game.OTTO_MATIC} mapping={mapping} audit={audit} /><div className="rounded border border-slate-700 bg-slate-900/50 p-2 text-xs text-slate-400"><div>Normalized request</div><code className="break-all">{requestText}</code></div>{stats && <div className="text-xs text-slate-400">Vertices: {stats.vertices} · Faces: {stats.faces}</div>}<Button variant="ghost" className="w-full" onClick={() => { invalidatePreview(); setError(null); }}><RotateCcw className="mr-2 h-4 w-4" />Clear preview</Button></CardContent></Card>}<div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded border border-slate-700"><ModelViewport scene={scene} bounds={bounds} version={fitVersion} /></div></div>;
}
