import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { AnimationMixer } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Result, ResultAsync } from "neverthrow";
import { disposeScriptModel } from "./scriptModelDisposal";
import { convertUploadedModel, parseUploadedObjectModel } from "./scriptUploadedModel";
import { getCollisionPreviewBounds } from "./scriptCollisionPreview";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

function AnimatedModel({ loaded, clip, playing, scale, speed }: { loaded: GLTF; clip: number; playing: boolean; scale: number; speed: number }) {
  const mixer = useRef<AnimationMixer | null>(null);
  useEffect(() => {
    const animation = loaded.animations[clip];
    if (!animation) return;
    const playback = new AnimationMixer(loaded.scene);
    mixer.current = playback;
    playback.clipAction(animation).play();
    return () => { playback.stopAllAction(); playback.uncacheRoot(loaded.scene); mixer.current = null; };
  }, [loaded, clip]);
  useFrame((_, delta) => { if (playing) mixer.current?.update(delta * speed); });
  return <group scale={scale}><primitive object={loaded.scene} /></group>;
}

export function UploadedObjectModelPreview({ definition, workspace }: { definition: ScriptCustomObjectDefinition; workspace: ScriptWorkspaceState }) {
  const [result, setResult] = useState<{ selection: object; assets: ScriptWorkspaceState["assets"]; loaded: GLTF | null; error: string } | null>(null);
  const [clip, setClip] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const visual = definition.visual;
  const collision = getCollisionPreviewBounds(definition, workspace.context.gameId);
  const modelPath = visual.kind === "customSkeleton" || visual.kind === "customDisplayGroup" ? visual.modelPath : "";
  const skeletonPath = visual.kind === "customSkeleton" ? visual.skeletonPath : "";
  const modelObject = visual.kind === "customDisplayGroup" ? visual.modelObject : 0;
  const selection = useMemo(() => ({ modelPath, skeletonPath, modelObject }), [modelPath, skeletonPath, modelObject]);
  const current = result?.selection === selection && result.assets === workspace.assets ? result : null;
  const loaded = current?.loaded;
  const error = current?.error;
  const initialClip = visual.kind === "customSkeleton" ? visual.animations[visual.initialAnimation] ?? 0 : 0;
  const selectedClip = Math.min(clip ?? initialClip, Math.max((loaded?.animations.length ?? 0) - 1, 0));
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let worker: Worker | null = null;
    let displayed: GLTF | null = null;
    async function load() {
      const parsed = await parseUploadedObjectModel(selection, workspace.assets);
      if (!active) return;
      if (parsed.isErr()) { setResult({ selection, assets: workspace.assets, loaded: null, error: parsed.error }); return; }
      const created = Result.fromThrowable(() => new Worker(new URL("../../../modelParsers/bg3dGltfWorker.ts", import.meta.url), { type: "module" }), () => "Could not start the model conversion worker.")();
      if (created.isErr()) { setResult({ selection, assets: workspace.assets, loaded: null, error: created.error }); return; }
      worker = created.value;
      const converted = await convertUploadedModel(worker, parsed.value, controller.signal);
      worker.terminate(); worker = null;
      if (!active) return;
      if (converted.isErr()) { setResult({ selection, assets: workspace.assets, loaded: null, error: converted.error }); return; }
      const scene = await ResultAsync.fromPromise(new GLTFLoader().parseAsync(converted.value, ""), () => "Could not display the uploaded native model.");
      if (!active) { if (scene.isOk()) disposeScriptModel(scene.value.scene); return; }
      if (scene.isOk()) displayed = scene.value;
      setResult({ selection, assets: workspace.assets, loaded: scene.isOk() ? scene.value : null, error: scene.isErr() ? scene.error : "" });
    }
    void load();
    return () => { active = false; controller.abort(); worker?.terminate(); if (displayed) disposeScriptModel(displayed.scene); };
  }, [selection, workspace.assets]);
  return <section aria-label="Uploaded model collision preview" className="rounded-lg border border-slate-700 p-3">
    <h4 className="font-medium">Uploaded model and collision</h4>
    {loaded ? <div className="h-80"><Canvas frameloop={playing && loaded.animations.length ? "always" : "demand"} camera={{ position: [200, 150, 200], fov: 45 }}>
      <ambientLight intensity={1} /><directionalLight position={[100, 200, 100]} intensity={2} />
      <Bounds key={`${visual.kind !== "none" ? visual.scale : 1}:${collision?.width}:${collision?.height}:${collision?.depth}`} fit clip observe margin={1.4} maxDuration={0}>
        <AnimatedModel loaded={loaded} clip={selectedClip} playing={playing} scale={visual.kind !== "none" ? visual.scale : 1} speed={visual.kind === "customSkeleton" ? visual.animationSpeed : 1} />
        {collision && <mesh><boxGeometry args={[collision.width, collision.height, collision.depth]} /><meshBasicMaterial color="#22d3ee" wireframe depthTest={false} /></mesh>}
      </Bounds><OrbitControls makeDefault />
    </Canvas></div> : <p role={error ? "alert" : "status"}>{error || "Loading uploaded model…"}</p>}
    {!!loaded?.animations.length && <div className="flex gap-3 p-2"><label>Preview animation <select value={selectedClip} onChange={(event) => setClip(Number(event.target.value))}>{loaded.animations.map((animation, index) => <option key={index} value={index}>{animation.name || `Animation ${index + 1}`}</option>)}</select></label><button type="button" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button></div>}
    <p className="workbench-muted">Cyan shows the native-rounded collision box at the object origin. Animation changes the model pose; the explicit collision box stays fixed.</p>
  </section>;
}
