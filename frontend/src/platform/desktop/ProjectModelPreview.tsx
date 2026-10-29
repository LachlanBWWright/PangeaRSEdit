import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { AnimationMixer, type AnimationClip, type Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import type { ProjectAsset } from "@pangea/desktop-contracts";
import type { ScriptCustomObjectDefinition } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopRequest } from "./client";
import { getCollisionPreviewBounds } from "@/editor/subviews/scripts/scriptCollisionPreview";

interface LoadedPreview { scene: Group; animations: AnimationClip[] }

function AnimatedAsset({ loaded, clip, scale, playing }: { loaded: LoadedPreview; clip: number; scale: number; playing: boolean }) {
  const mixer = useRef<AnimationMixer | null>(null);
  useEffect(() => {
    const selected = loaded.animations[clip];
    if (!selected) return;
    const playback = new AnimationMixer(loaded.scene);
    mixer.current = playback;
    playback.clipAction(selected).play();
    return () => { playback.stopAllAction(); playback.uncacheRoot(loaded.scene); mixer.current = null; };
  }, [loaded, clip]);
  useFrame((_, delta) => { if (playing) mixer.current?.update(delta); });
  return <group scale={scale}><primitive object={loaded.scene} /></group>;
}

export function ProjectModelPreview({ asset, definition, onReady }: { asset: ProjectAsset; definition?: ScriptCustomObjectDefinition; onReady?: (revision: string) => void }) {
  const [loaded, setLoaded] = useState<LoadedPreview | null>(null);
  const [error, setError] = useState("");
  const [clip, setClip] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scale = definition && definition.visual.kind !== "none" ? definition.visual.scale : 1;
  const collision = definition ? getCollisionPreviewBounds(definition, asset.game) : null;
  useEffect(() => {
    let active = true;
    async function load() {
      const bytes = await desktopRequest({ operation: "assets.preview", id: asset.id, revision: asset.revision }, z.instanceof(Uint8Array));
      if (!active) return;
      if (bytes.isErr()) { setError(bytes.error.message); return; }
      const parsed = await ResultAsync.fromPromise(new GLTFLoader().parseAsync(Uint8Array.from(bytes.value).buffer, ""), () => "Could not display the converted game model.");
      if (!active) return;
      if (parsed.isErr()) { setError(parsed.error); return; }
      setLoaded({ scene: parsed.value.scene, animations: parsed.value.animations });
      onReady?.(asset.revision);
    }
    void load();
    return () => { active = false; };
  }, [asset.id, asset.revision, onReady]);
  return <section aria-label="Converted model preview" className="overflow-hidden rounded-md border border-slate-700">
    <div className="h-80 bg-slate-900">
      {loaded ? <Canvas frameloop={playing && loaded.animations.length ? "always" : "demand"} camera={{ position: [200, 150, 200], fov: 45 }}>
        <color attach="background" args={["#1c2739"]} /><ambientLight intensity={1} /><directionalLight position={[100, 200, 100]} intensity={2} />
        <Bounds key={`${scale}:${collision?.width}:${collision?.height}:${collision?.depth}`} fit clip observe margin={1.4} maxDuration={0}>
          <AnimatedAsset key={`${asset.revision}:${clip}`} loaded={loaded} clip={clip} scale={scale} playing={playing} />
          {collision && <mesh><boxGeometry args={[collision.width, collision.height, collision.depth]} /><meshBasicMaterial color="#22d3ee" wireframe depthTest={false} /></mesh>}
        </Bounds>
        <gridHelper args={[1000, 20, "#52677f", "#334155"]} />
        <OrbitControls makeDefault />
      </Canvas> : <p className="flex h-full items-center justify-center p-6 text-sm text-slate-300" role={error ? "alert" : "status"}>{error || "Loading converted model…"}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-3 text-sm">
      <span className="text-slate-400">Game output, grid spacing 50 units</span>
      {collision && <span className="text-cyan-300">Collision: {collision.width} × {collision.height} × {collision.depth} units, centered at origin</span>}
      {asset.animations.length > 0 && <><label className="flex items-center gap-2">Preview animation<select className="rounded border border-slate-600 bg-slate-900 p-1" value={clip} onChange={(event) => setClip(Number(event.target.value))}>{asset.animations.map((animation) => <option key={animation.index} value={animation.index}>{animation.name || `Animation ${animation.index + 1}`}</option>)}</select></label><button type="button" className="rounded border border-slate-600 px-3 py-1 focus-visible:outline" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button></>}
    </div>
  </section>;
}
